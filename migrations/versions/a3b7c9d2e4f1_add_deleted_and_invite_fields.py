"""add deleted and invite_expires_at to players, add deleted to matches

Revision ID: a3b7c9d2e4f1
Revises: fe11d3e24fbe
Create Date: 2026-06-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3b7c9d2e4f1'
down_revision = 'fe11d3e24fbe'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('players', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deleted', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('invite_expires_at', sa.Integer(), nullable=False, server_default='0'))

    with op.batch_alter_table('matches', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deleted', sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    with op.batch_alter_table('players', schema=None) as batch_op:
        batch_op.drop_column('invite_expires_at')
        batch_op.drop_column('deleted')

    with op.batch_alter_table('matches', schema=None) as batch_op:
        batch_op.drop_column('deleted')
