# app/services/chunking_service.py
from dataclasses import dataclass

import tiktoken
from nltk.tokenize import sent_tokenize

_ENCODING = tiktoken.get_encoding("cl100k_base")

MAX_CHUNK_TOKENS = 500
OVERLAP_TOKENS = 90  # ~15-20% of 500, per docs/ingestion-design-decisions.md


@dataclass
class ChunkData:
    chunk_index: int
    content: str
    token_count: int


def _count_tokens(text: str) -> int:
    return len(_ENCODING.encode(text))


def chunk_text(raw_text: str) -> list[ChunkData]:
    """
    Splits raw_text into overlapping, sentence-boundary-respecting chunks.

    Chunks never split a sentence across a boundary. Overlap is achieved by
    carrying trailing sentences from the end of one chunk into the start of
    the next, up to ~OVERLAP_TOKENS worth.
    """
    sentences = sent_tokenize(raw_text)
    if not sentences:
        return []

    chunks: list[ChunkData] = []
    current_sentences: list[str] = []
    current_tokens = 0
    chunk_index = 0

    i = 0
    while i < len(sentences):
        sentence = sentences[i]
        sentence_tokens = _count_tokens(sentence)

        # If a single sentence alone exceeds the max, it becomes its own
        # chunk rather than being split mid-sentence (a rare edge case,
        # but sentence-boundary integrity takes priority over hitting the
        # exact size target).
        if sentence_tokens > MAX_CHUNK_TOKENS:
            if current_sentences:
                chunks.append(ChunkData(
                    chunk_index=chunk_index,
                    content=" ".join(current_sentences),
                    token_count=current_tokens,
                ))
                chunk_index += 1
                current_sentences, current_tokens = [], 0

            chunks.append(ChunkData(
                chunk_index=chunk_index,
                content=sentence,
                token_count=sentence_tokens,
            ))
            chunk_index += 1
            i += 1
            continue

        if current_tokens + sentence_tokens > MAX_CHUNK_TOKENS:
            # Finalize current chunk.
            chunks.append(ChunkData(
                chunk_index=chunk_index,
                content=" ".join(current_sentences),
                token_count=current_tokens,
            ))
            chunk_index += 1

            # Start next chunk with overlap: carry trailing sentences from
            # the just-finished chunk until we've got ~OVERLAP_TOKENS worth.
            overlap_sentences: list[str] = []
            overlap_tokens = 0
            for s in reversed(current_sentences):
                s_tokens = _count_tokens(s)
                if overlap_tokens + s_tokens > OVERLAP_TOKENS:
                    break
                overlap_sentences.insert(0, s)
                overlap_tokens += s_tokens

            current_sentences = overlap_sentences
            current_tokens = overlap_tokens
            continue  # re-process this sentence against the new (overlap-seeded) chunk

        current_sentences.append(sentence)
        current_tokens += sentence_tokens
        i += 1

    # Final trailing chunk, if anything's left.
    if current_sentences:
        chunks.append(ChunkData(
            chunk_index=chunk_index,
            content=" ".join(current_sentences),
            token_count=current_tokens,
        ))

    return chunks