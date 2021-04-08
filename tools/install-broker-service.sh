#!/bin/bash
# Installs the camera broker software to run as a service

# Check if the service is installed; setup if needed
cat > /lib/systemd/system/camera-broker.service <<EOF
[Unit]
Description=Pan and Tilt Camera broker
Documentation=https://example.com
After=network.target

[Service]
Environment=
Type=simple
User=root
WorkingDirectory=/home/pi/broker
ExecStart=/usr/bin/node /home/pi/broker/broker.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable camera.service
systemctl start camera.service
