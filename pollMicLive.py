#!/usr/bin/python
# Run this on studioa-pi during autostart script
import RPi.GPIO as GPIO
GPIO.setmode(GPIO.BOARD)
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
		GPIO.setmode(GPIO.BOARD)

		GPIO.setup(7, GPIO.IN) 

		newstate = 1 - GPIO.input(7)
		json = '{ "micLiveState": ' + str(newstate) + '}'
		web.header('Access-Control-Allow-Origin', '*')

		GPIO.cleanup()
		return json

if __name__ == '__main__':
    app.run()
