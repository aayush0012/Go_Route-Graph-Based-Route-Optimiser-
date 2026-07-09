from sqlalchemy import Boolean, Column, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.database.base import Base


class Road(Base):
    __tablename__ = "roads"
    id = Column(Integer, primary_key=True, index=True)
    source_city_id = Column(
        Integer,
        ForeignKey("cities.id"),
        nullable=False,
    )
    destination_city_id = Column(
        Integer,
        ForeignKey("cities.id"),
        nullable=False,
    )
    distance = Column(Integer, nullable=False)
    is_bidirectional = Column(
        Boolean,
        default=True,
        nullable=False,
    )
    source_city = relationship(
        "City",
        foreign_keys=[source_city_id],
    )
    destination_city = relationship(
        "City",
        foreign_keys=[destination_city_id],
    )