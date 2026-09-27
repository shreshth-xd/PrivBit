"""add messages table, polymorphic chunks

Revision ID: c8d9355c1db0
Revises: 6f469958de7d
Create Date: 2026-09-26 16:41:05.403559

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8d9355c1db0'
down_revision: Union[str, Sequence[str], None] = '6f469958de7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('messages',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('capture_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('encrypted_content', sa.LargeBinary(), nullable=False),
    sa.Column('message_index', sa.Integer(), nullable=False),
    sa.Column('embedding_status', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['capture_id'], ['captures.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.add_column('chunks', sa.Column('message_id', sa.UUID(), nullable=True))
    op.add_column(
        'chunks',
        sa.Column('source_type', sa.String(length=20), nullable=False, server_default='capture'),
    )
    op.alter_column('chunks', 'capture_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.create_foreign_key(
        'chunks_message_id_fkey', 'chunks', 'messages', ['message_id'], ['id'], ondelete='CASCADE',
    )
    op.create_check_constraint(
        'chunks_exactly_one_source',
        'chunks',
        '(capture_id IS NOT NULL AND message_id IS NULL) OR (capture_id IS NULL AND message_id IS NOT NULL)',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('chunks_exactly_one_source', 'chunks', type_='check')
    op.drop_constraint('chunks_message_id_fkey', 'chunks', type_='foreignkey')
    op.alter_column('chunks', 'capture_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.drop_column('chunks', 'source_type')
    op.drop_column('chunks', 'message_id')
    op.drop_table('messages')