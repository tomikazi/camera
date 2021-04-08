#!/bin/bash
# Installs and starts the camera software

# Create the directory and hop into it
mkdir camera 2<//dev/null
cd camera

# Temporarily clone the camera software and copy the camera portion over; then remove the clone
git clone http://github.com/tomikazi/camera clone
cp -r clone/camera/* .
npm install
rm -fr clone

# Stop and restart the service
systemctl stop camera.service
systemctl start camera.service
