#!/bin/sh

#check if the file name is provided as an argument
if [ "$#" -ne 1 ]; then
	    echo "Usage: $0 filename"
	        exit 1
fi

# Sort the file and remove duplicate lines
 sort "$1" | uniq > temp_file && mv temp_file "$1"
