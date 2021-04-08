#!/bin/bash
# Installs and starts the camera software

# Create the directory and hop into it
mkdir ~/camera 2</dev/null
cd ~/camera

# Temporarily clone the camera software and copy the camera portion over; then remove the clone
git clone http://github.com/tomikazi/camera clone
cp -r clone/camera/* .
npm install
rm -fr clone

# Check if the service is installed; setup if needed
if [ ! -f /lib/systemd/system/camera.service ]; then
  echo "To install camera as a service run the following:"
  echo "curl https://raw.githubusercontent.com/tomikazi/camera/master/tools/install-camera-service.sh | sudo sh -s CAMERA-NAME [BROKER-URL]"
fi
