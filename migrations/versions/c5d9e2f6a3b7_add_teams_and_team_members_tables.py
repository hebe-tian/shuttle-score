"""add teams and team_members tables

Revision ID: c5d9e2f6a3b7
Revises: b4c8d1e5f2a3
Create Date: 2026-06-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5d9e2f6a3b7'
down_revision = 'b4c8d1e5f2a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'teams',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('invite_code', sa.Text(), nullable=False),
        sa.Column('invite_expires_at', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('deleted', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invite_code'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'])
    )

    op.create_table(
        'team_members',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('joined_at', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_id', 'user_id'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'])
    )

    with op.batch_alter_table('players') as batch_op:
        batch_op.add_column(sa.Column('team_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_players_team_id', 'teams', ['team_id'], ['id'])

    with op.batch_alter_table('matches') as batch_op:
        batch_op.add_column(sa.Column('team_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_matches_team_id', 'teams', ['team_id'], ['id'])


def downgrade():
    with op.batch_alter_table('matches') as batch_op:
        batch_op.drop_constraint('fk_matches_team_id', type_='foreignkey')
        batch_op.drop_column('team_id')

    with op.batch_alter_table('players') as batch_op:
        batch_op.drop_constraint('fk_players_team_id', type_='foreignkey')
        batch_op.drop_column('team_id')

    op.drop_table('team_members')
    op.drop_table('teams')
