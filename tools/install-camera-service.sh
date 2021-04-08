#!/bin/bash
# Installs the camera software to run as a service

cameraName=${1:-$(hostname)}
brokerUrl=${2:-http://vachuska.com:6000/camera}

cat > /lib/systemd/system/camera.service <<EOF
[Unit]
Description=Pan and Tilt Camera client
Documentation=https://example.com
After=network.target

[Service]
Environment=
Type=simple
User=root
WorkingDirectory=/home/pi/camera
ExecStart=/usr/bin/node /home/pi/camera/client.js --url=${brokerUrl} --name ${cameraName}
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable camera.service
systemctl start camera.service
