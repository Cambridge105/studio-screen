#!/bin/bash
#
# Deploy the Green Room Pi display on a fresh install of Raspberry Pi OS
# 
# This script is intended to be launched from the raw GitHub content - it
# does not assume a local clone.

set -e
if [ "$(id -u)" != "0" ]; then
   echo "Usage: sudo bash setup.sh" 1>&2
   exit 1
fi

# Make sure we have a sensible hostname
if [ -z "$NEWHOSTNAME" ]; then
    read -p "Enter a hostname for this machine: " NEWHOSTNAME
fi
echo "Using new hostname from NEWHOSTNAME: $NEWHOSTNAME"
hostname $NEWHOSTNAME
echo $NEWHOSTNAME > /etc/hostname
grep "$NEWHOSTNAME" /etc/hosts || echo "127.0.0.1 $NEWHOSTNAME" >> /etc/hosts

# Update and install any required packages
apt update
apt updgrade
apt install chromium vim ntp git python3 python3-pip unclutter nginx
pip3 install web.py

# Enable SSH
systemctl enable ssh
systemctl start ssh

# Make sure we have the latest version of the studio-screen repo checked out
if [ ! -d /opt/info-display ]; then 
	mkdir -r /opt/info-display
fi
if [ ! -d /opt/info-display/studio-screen ]; then
	git clone https://github.com/Cambridge105/studio-screen.git /opt/info-display
fi
pushd /opt/info-display/studio-screen
git pull
popd
chown pi:pi /opt/info-display -R

