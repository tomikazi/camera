#!/bin/bash
# Installs and starts the broker software

# Create the directory and hop into it
mkdir ~/broker 2</dev/null
cd ~/broker

# Temporarily clone the camera software and copy the camera portion over; then remove the clone
git clone http://github.com/tomikazi/camera clone
cp -r clone/broker/* .
npm install
rm -fr clone

# Check if the service is installed; issue note to install
if [ ! -f /lib/systemd/system/camera-broker.service ]; then
  echo "To install camera broker as a service run the following:"
  echo "curl -s https://raw.githubusercontent.com/tomikazi/camera/master/tools/install-broker-service.sh | sudo sh"
else
  echo "Restart camera broker service via:"
  echo "sudo systemctl stop camera-broker.service"
  echo "sudo systemctl start camera-broker.service"
fi
