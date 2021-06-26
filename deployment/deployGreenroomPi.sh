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
    NEWHOSTNAME=greenroom-pi
fi
echo "Using new hostname from NEWHOSTNAME: $NEWHOSTNAME"
hostname $NEWHOSTNAME
echo $NEWHOSTNAME > /etc/hostname
grep "$NEWHOSTNAME" /etc/hosts || echo "127.0.0.1 $NEWHOSTNAME" >> /etc/hosts

# Update and install any required packages
apt update
apt upgrade -y
apt install chromium vim ntp git python3 python3-pip unclutter nginx wget curl -y
pip3 install web.py

# Enable SSH
systemctl enable ssh
systemctl start ssh

# Make sure we have the latest version of the studio-screen repo checked out
if [ ! -d /opt/studio-screen ]; then 
	mkdir -p /opt/studio-screen
fi
if [ ! -d /opt/studio-screen/.git ]; then
	git clone https://github.com/Cambridge105/studio-screen.git /opt/studio-screen
fi
pushd /opt/studio-screen
git pull
popd
chown pi:pi /opt/studio-screen -R

# Check timezones are correct
echo "Europe/London" > /etc/timezone
ln -sf /usr/share/zoneinfo/Europe/London /etc/localtime

# Create cron jobs
cp /opt/studio-screen/deployment/*.service /opt/studio-screen/deployment/*.timer /etc/systemd/system/
systemctl enable update-schedule.timer
systemctl start update-schedule.timer

# Create nginx config
rm /etc/nginx/sites-available/*
cp /opt/studio-screen/deployment/nginx-studio-screen /etc/nginx/sites-available/studio-screen
systemctl enable nginx
systemctl start nginx
systemctl reload nginx

# Create autostart configuration
if [ ! -d /etc/xdg/lxsession/LXDE-pi ]; then
   mkdir -p /etc/xdg/lxsession/LXDE-pi
fi
cp /opt/studio-screen/deployment/lxde-autostart /etc/xdg/lxsession/LXDE-pi/autostart
if [ ! -d /home/pi/.config/lxsession/LXDE-pi ]; then
   mkdir -p /home/pi/.config/lxsesion/LXDE-pi
fi
cp /opt/studio-screen/deployment/lxde-autostart /home/pi/.config/lxsession
cp /opt/studio-screen/deployment/lxde-autostart /etc/xdg/lxsession/LXDE-pi/autostart
chown pi:pi /home/pi/.config -R
