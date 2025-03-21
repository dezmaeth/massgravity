"""Add faction and materials

Revision ID: a1b2c3d4e5f6
Revises: 5fda62f18e47
Create Date: 2025-03-17 02:35:12.123456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '5fda62f18e47'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('faction', sa.String(length=10), nullable=False, server_default='blue'))
    
    with op.batch_alter_table('game_settings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('fighter_hangar_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('shipyard_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('fighter_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('capital_ship_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('blue_material_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('red_material_rate', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('green_material_rate', sa.Float(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('game_settings', schema=None) as batch_op:
        batch_op.drop_column('green_material_rate')
        batch_op.drop_column('red_material_rate')
        batch_op.drop_column('blue_material_rate')
        batch_op.drop_column('capital_ship_cost')
        batch_op.drop_column('fighter_cost')
        batch_op.drop_column('shipyard_cost')
        batch_op.drop_column('fighter_hangar_cost')
    
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('faction')
    # ### end Alembic commands ###