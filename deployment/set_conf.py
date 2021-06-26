#!/usr/bin/python3

# Source: https://github.com/ichtm/set_conf/blob/master/set_conf.py, MIT license
# ********************************
# set_conf.py
# (C) by ichtm, github.com/ichtm
#
# ********************************
# A simple wrapper for configparser library, just for setting one value in a file,
# which is delimited by '=' instead of ' = '. Nothing else.
# Inspired by crudini's disability to write ini-files without ' = ' spaces.
# ********************************

import sys
import configparser

if sys.version_info[0] < 3:
    raise Exception("Requires Python 3")

args = sys.argv[1:]

if len(args) != 4:
    print("Usage:   $ python3 set_conf.py <filename.conf> <section> <option> <new_value>")
    print("Example: $ python3 set_conf.py myfilename.conf mysection myoption 42")
    exit(1)

[target_file, section_target, option_target, after_value] = args

cp = configparser.ConfigParser(allow_no_value=True, delimiters=['='])
cp.read(target_file, encoding='UTF8')

before_value = None

if cp.has_section(section_target) and cp.has_option(section_target, option_target):
    before_value = cp.get(section_target, option_target)
else:
    print("Section", section_target, " / Option", option_target, "did not exist. Creating ..")
    cp.add_section(section_target)

print("Section", section_target, " / Option", option_target, " Value before: ", before_value)
cp.set(section_target, option_target, after_value)

try:
    with open(target_file, 'w') as configfile:
        cp.write(configfile, space_around_delimiters=False)
except configparser.Error as e:
    # in case you don't have write permission
    print(e)
finally:
    print("Modified: ", section_target, " / ", option_target, " from: ", before_value, " to: ", after_value)

cp.clear()
