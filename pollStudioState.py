#!/usr/bin/python
# Run this on greenroom-pi during autostart script
import RPi.GPIO as GPIO
GPIO.setmode(GPIO.BOARD)
import time
 
import web

PORT_NUMBER = 8081

urls = (
    '/studios', 'studios'
)

app = web.application(urls, globals())
web.header('Access-Control-Allow-Origin', '*')

class miclive:
	
	#Handler for the GET requests
	def GET(self):
		GPIO.setup(0, GPIO.IN) 
		GPIO.setup(1, GPIO.IN) 
		GPIO.setup(2, GPIO.IN) 

		astate = 1 - GPIO.input(0)
		bstate = 1 - GPIO.input(1)
		remstate = 1 - GPIO.input(2)
		json = '{ "a": ' + str(astate) + ', "b": ' + str(bstate) + ', "remote" ' + str(remstate) + '}'

		GPIO.cleanup()
		return json

if __name__ == '__main__':
    app.run()
