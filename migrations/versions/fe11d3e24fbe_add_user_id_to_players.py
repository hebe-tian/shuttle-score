"""add user_id to players

Revision ID: fe11d3e24fbe
Revises: d78506d45f03
Create Date: 2026-06-02 15:21:28.524519

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fe11d3e24fbe'
down_revision = 'd78506d45f03'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('players', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_players_user_id', 'users', ['user_id'], ['id'])


def downgrade():
    with op.batch_alter_table('players', schema=None) as batch_op:
        batch_op.drop_constraint('fk_players_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')
