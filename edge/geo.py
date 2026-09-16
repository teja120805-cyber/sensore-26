"""
GPS/altitude source for the edge pipeline.

Right now this returns a FIXED PLACEHOLDER position (config.DEFAULT_LAT /
config.DEFAULT_LON / config.CAMERA_HEIGHT_M) so the rest of the pipeline
(detection -> severity -> upload) can be built, tested, and demoed before the
Pixhawk GPS module is wired in.

--- How to swap in the real Pixhawk GPS + altitude later ---
1. pip install pymavlink
2. Open a MAVLink connection to the Pixhawk's TELEM2 port once, at startup:

       from pymavlink import mavutil
       _mav = mavutil.mavlink_connection('/dev/serial0', baud=57600)
       _mav.wait_heartbeat()

3. Replace the body of get_position() below with something like:

       msg = _mav.recv_match(type='GLOBAL_POSITION_INT', blocking=True, timeout=1)
       if msg is None:
           return None  # no fresh telemetry yet — caller skips this detection
       lat = msg.lat / 1e7
       lon = msg.lon / 1e7
       altitude_m = msg.relative_alt / 1000.0   # altitude above home/takeoff point, in meters
       return lat, lon, altitude_m

4. Keep the same return shape: (lat: float, lon: float, altitude_m: float), or
   None when there's no fix. Nothing else in the pipeline (severity.py,
   main.py) needs to change.
"""

from . import config


def get_position():
    """
    Returns (lat, lon, altitude_m) for the current frame, or None if unavailable.

    PLACEHOLDER: always returns the fixed config.DEFAULT_LAT / config.DEFAULT_LON
    and config.CAMERA_HEIGHT_M. Swap this out for a real pymavlink read once the
    Pixhawk GPS module is integrated — see the module docstring above.
    """
    return config.DEFAULT_LAT, config.DEFAULT_LON, config.CAMERA_HEIGHT_M
