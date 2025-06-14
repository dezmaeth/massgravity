"""empty message

Revision ID: ff4da29d09af
Revises: b0856f9aa674
Create Date: 2025-03-18 01:20:32.340591

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ff4da29d09af'
down_revision = 'b0856f9aa674'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto-generated by Alembic - please adjust! ###
    with op.batch_alter_table('game_settings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('initial_research_points', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('initial_population', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('research_rate', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('population_rate', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('colony_base_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('mining_facility_research_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('defense_facility_research_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('research_facility_research_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('colony_base_research_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('fighter_hangar_research_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('shipyard_research_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('mining_facility_population_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('defense_facility_population_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('research_facility_population_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('colony_base_population_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('fighter_hangar_population_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('shipyard_population_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('fighter_hangar_material_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('shipyard_blue_material_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('shipyard_red_material_cost', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('shipyard_green_material_cost', sa.Integer(), nullable=True))
        batch_op.drop_column('ship_cost')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('game_settings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('ship_cost', sa.INTEGER(), nullable=True))
        batch_op.drop_column('shipyard_green_material_cost')
        batch_op.drop_column('shipyard_red_material_cost')
        batch_op.drop_column('shipyard_blue_material_cost')
        batch_op.drop_column('fighter_hangar_material_cost')
        batch_op.drop_column('shipyard_population_cost')
        batch_op.drop_column('fighter_hangar_population_cost')
        batch_op.drop_column('colony_base_population_cost')
        batch_op.drop_column('research_facility_population_cost')
        batch_op.drop_column('defense_facility_population_cost')
        batch_op.drop_column('mining_facility_population_cost')
        batch_op.drop_column('shipyard_research_cost')
        batch_op.drop_column('fighter_hangar_research_cost')
        batch_op.drop_column('colony_base_research_cost')
        batch_op.drop_column('research_facility_research_cost')
        batch_op.drop_column('defense_facility_research_cost')
        batch_op.drop_column('mining_facility_research_cost')
        batch_op.drop_column('colony_base_cost')
        batch_op.drop_column('population_rate')
        batch_op.drop_column('research_rate')
        batch_op.drop_column('initial_population')
        batch_op.drop_column('initial_research_points')

    # ### end Alembic commands ###
