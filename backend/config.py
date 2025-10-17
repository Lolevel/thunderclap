"""
Flask application configuration
"""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Base configuration"""

    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'postgresql://localhost/pl_scout'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL query logging

    # Riot API
    RIOT_API_KEY = os.environ.get('RIOT_API_KEY')
    RIOT_REGION = os.environ.get('RIOT_REGION', 'europe')
    RIOT_PLATFORM = os.environ.get('RIOT_PLATFORM', 'euw1')

    # Rate Limiting
    RIOT_RATE_LIMIT_PER_SECOND = int(os.environ.get('RIOT_RATE_LIMIT_PER_SECOND', 20))
    RIOT_RATE_LIMIT_PER_TWO_MINUTES = int(os.environ.get('RIOT_RATE_LIMIT_PER_TWO_MINUTES', 100))

    # Cache
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_ENABLED = os.environ.get('CACHE_ENABLED', 'False').lower() == 'true'

    # Pagination
    ITEMS_PER_PAGE = 20


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_ECHO = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'postgresql://localhost/pl_scout_test'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
