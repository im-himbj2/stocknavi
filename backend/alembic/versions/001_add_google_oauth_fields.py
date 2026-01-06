"""add google oauth fields

Revision ID: 001_google_oauth
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_google_oauth'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add google_id column
    op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)
    
    # Add auth_provider column
    op.add_column('users', sa.Column('auth_provider', sa.String(), nullable=True, server_default='email'))
    
    # Make hashed_password nullable (for OAuth users)
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(),
                    nullable=True)


def downgrade() -> None:
    # Revert hashed_password to not nullable
    op.alter_column('users', 'hashed_password',
                    existing_type=sa.String(),
                    nullable=False)
    
    # Remove auth_provider column
    op.drop_column('users', 'auth_provider')
    
    # Remove google_id column
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'google_id')





