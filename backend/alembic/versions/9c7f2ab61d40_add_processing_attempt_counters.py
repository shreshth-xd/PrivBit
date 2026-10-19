"""add processing attempt counters

Revision ID: 9c7f2ab61d40
Revises: 4ed272eda6f6
Create Date: 2026-10-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9c7f2ab61d40"
down_revision: Union[str, Sequence[str], None] = "4ed272eda6f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "captures",
        sa.Column("processing_attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )
    op.add_column(
        "chunks",
        sa.Column("embedding_attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("chunks", "embedding_attempts")
    op.drop_column("captures", "processing_attempts")