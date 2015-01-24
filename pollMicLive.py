#!/usr/bin/python
import Adafruit_BBIO.GPIO as GPIO
import time
 
import web

PORT_NUMBER = 8081

urls = (
    '/miclive', 'miclive'
)

app = web.application(urls, globals())

class miclive:
	
	#Handler for the GET requests
	def GET(self):
		GPIO.setup("P9_11", GPIO.IN) #AKA GPIO_30 see diagram at http://kilobaser.com/blog/2014-07-15-beaglebone-black-gpios

		newstate = not GPIO.input("P9_11")
		json = '{ "micLiveState": ' + str(newstate) + '}'
		web.header('Access-Control-Allow-Origin', '*')

		GPIO.cleanup()
		return json

if __name__ == '__main__':
    app.run()
