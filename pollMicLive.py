#!/usr/bin/python
import Adafruit_BBIO.GPIO as GPIO
import time
 
GPIO.setup("P9_11", GPIO.IN) #AKA GPIO_30 see diagram at http://kilobaser.com/blog/2014-07-15-beaglebone-black-gpios
 
while True:
	GPIO.wait_for_edge("P9_11")
	time.sleep(0.1)
	newstate = GPIO.input("P9_11")
	json = '{ "micLiveState": ' + str(newstate) + '}'
	f = open('micLive.js','w')
	f.write(json)
	f.close
			
GPIO.cleanup()
  