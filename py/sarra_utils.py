#!/usr/bin/env python3

# ------------------------------------------------------------------------------------
#   Description   : sarra_catalogr.py
#                   - Parse a dir recursively
#                   - Build its paths and files representation in a json & toc file
#
#   created       : 2017-09-18 08:00:00
#   last-modified : 2018-10-18 10:47:00
#
#   Author        : Daniel Leveille
#                    SPC- Gouvernement du Canada
#                    SSC- Government of Canada
# ------------------------------------------------------------------------------------

# ------------------------------------------------------------------------------------
# IMPORTS
# ------------------------------------------------------------------------------------

import argparse, locale, time

# ------------------------------------------------------------------------------------
# colorize texts output
# BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE = range(8)
BK,RD,GR,YL,BL,MG,CY,WH = range(8)

def colr(text, colour=WH):
    return "\x1b[1;{}m{}\x1b[0m".format( (30+colour), text )

def L(n=100,c='-'):
    return c*n

def S(n=10):
    return ' '*n

def sizeof_fmt(num, suffix='B'):
    for unit in ['','K','M','G','T','P','E','Z']:
        if abs(num) < 1024.0:
            return "{:3.1f}{}{}".format(num, unit, suffix)
        num /= 1024.0
    return "{:.1f}{}{}".format(num, 'Y', suffix)

def num_fmt(num):
    locale.setlocale(locale.LC_ALL, 'en_CA.utf-8')
    return locale.format('%d', num, 1)

def getTime():
    return time.time()

def getDateTimeFormatted():
    from datetime import datetime
    return datetime.today().strftime('%Y-%m-%d - %H:%M:%S (%A, %d %B %Y)')

def file_size(fname):
        import os
        statinfo = os.stat(fname)
        return sizeof_fmt(statinfo.st_size)

#print("File size in bytes of a plain file: ",file_size("test.txt"))

# ------------------------------------------------------------------------------------

