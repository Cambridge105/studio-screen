#!/usr/bin/python
import Adafruit_BBIO.GPIO as GPIO
import time
 
from BaseHTTPServer import BaseHTTPRequestHandler,HTTPServer
from os import curdir, sep

PORT_NUMBER = 8080

class myHandler(BaseHTTPRequestHandler):
	
	#Handler for the GET requests
	def do_GET(self):
		GPIO.setup("P9_11", GPIO.IN) #AKA GPIO_30 see diagram at http://kilobaser.com/blog/2014-07-15-beaglebone-black-gpios

		newstate = GPIO.input("P9_11")
		json = '{ "micLiveState": ' + str(newstate) + '}'
		# f = open('micLive.js','w')
		# f.write(json)
		# f.close
				
		f = open(curdir + sep + self.path) 
		self.send_response(200)
		self.send_header('Content-type',"application/json")
		self.end_headers()
		self.wfile.write(json)
		f.close()

		GPIO.cleanup()

try:
	#Create a web server and define the handler to manage the
	#incoming request
	server = HTTPServer(('', PORT_NUMBER), myHandler)
	print 'Started httpserver on port ' , PORT_NUMBER
	
	#Wait forever for incoming htto requests
	server.serve_forever()

except KeyboardInterrupt:
	print '^C received, shutting down the web server'
	server.socket.close()