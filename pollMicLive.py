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
GPIO.setup(7, GPIO.IN) 

app = web.application(urls, globals())

class miclive:
	
	#Handler for the GET requests
	def GET(self):
		newstate = 1 - GPIO.input(7)
		json = '{ "micLiveState": ' + str(newstate) + '}'
		web.header('Access-Control-Allow-Origin', '*')
		web.header('Content-Type', 'application/json')

		return json

if __name__ == '__main__':
    app.run()
