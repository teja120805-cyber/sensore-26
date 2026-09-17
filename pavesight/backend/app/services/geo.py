"""Small PostGIS/geometry helpers shared by the API routers."""
from geoalchemy2.types import Geometry
from sqlalchemy import cast, func
from sqlalchemy.orm import Query

from app.models.detection import Detection


def make_point(lon: float, lat: float):
    return func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)


def as_geometry(geog_col):
    """Cast a GEOGRAPHY column to GEOMETRY so ST_X/ST_Y/ST_ClusterDBSCAN apply."""
    return cast(geog_col, Geometry)


def bbox_filter(query: Query, min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> Query:
    envelope = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    return query.filter(func.ST_Intersects(as_geometry(Detection.geom), envelope))


def detection_lon(geom_col):
    return func.ST_X(as_geometry(geom_col))


def detection_lat(geom_col):
    return func.ST_Y(as_geometry(geom_col))
