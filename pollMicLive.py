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

		newstate = GPIO.input("P9_11")
		json = '{ "micLiveState": ' + str(newstate) + '}'
		# f = open('micLive.js','w')
		# f.write(json)
		# f.close
				
		#self.send_response(200)
		#self.send_header('Content-type',"application/json")
		#self.end_headers()
		#self.wfile.write(json)

		GPIO.cleanup()
		return json

if __name__ == '__main__':
    app.run()
