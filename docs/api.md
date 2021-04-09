# REST API

Other applications can use the following REST API to query and control the remote cameras.

* `GET /camera/api/cameras`
    * returns array of currently registered camera names
* `GET /camera/api/viewers`
    * returns array of objects with camera name and the viewer remote address
* `GET /camera/api/:camera`
    * returns current camera position and any remote viewers
* `PUT /camera/api/:camera`
    * issues command to the specified camera, `autohome`, `moveTo`, `moveBy`
    * `moveTo` takes either `pos` set to `12`, `3`, `6`, `-6`, `9` or `pan` and `tilt` coordinates
    * `moveBy` takes `pan` and `tilt` steps relative to current position
* `DELETE /camera/api/:camera/:viewerIP`
    * disconnects all viewers from the specified IP address on the given camera; this can be used
      after revoking a token
      
## Authorization
If token authorization is enabled, the HTTP request must have the `id` and `token` headers populated
with corresponding camera name and camera token. Any camera token can be used to obtain list of cameras
and list of viewers, but any camera-specific requests must have camera-specific `id` and `token` specified.

# Examples
The following are a few examples of how one might use the `curl` command to issue API requests:
```
# Trigger autohome
curl -H 'Content-type: application/json' -H 'id: FrontYard' -H 'token: 340d1b94-9bd4-893f-49ef-4c772132ce06' \
    -X PUT http://broker.local:6000/camera/api/FrontYard -d '{ "cmd": "autohome" }'

# Pan to 9 o'clock position; tilt level at 0
curl -H 'Content-type: application/json' -H 'id: FrontYard' -H 'token: 340d1b94-9bd4-893f-49ef-4c772132ce06' \
    -X PUT https://broker.local:6000/camera/api/FrontYard -d '{ "cmd": "moveTo", "pos": "9" }'

# Pan to specific coordinates
curl -H 'Content-type: application/json' -H 'id: FrontYard' -H 'token: 340d1b94-9bd4-893f-49ef-4c772132ce06' \
    -X PUT https://broker.local:6000/camera/api/FrontYard -d '{ "cmd": "moveTo", "pan": -1050, "tilt": 200 }'
```