#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Author:  Daniel Léveillé
# Created: 2018-05-24
# Inspired by the work of Evandro Leopoldino Gonçalves:
#   https://github.com/EvandroLG/pyrallelize

import math, multiprocessing, urllib.request, shutil, os, traceback
from multiprocessing import Pool
from functools       import partial
from sarra_utils     import *
from types           import SimpleNamespace

# ------------------------------------------------------------------------------------
print(L())
print( '\n', colr("Parallel download using configuration:", GR), '\n' )

config  = { 'maxp':12, 'tmp':'/tmp/_downloads_/', 'usr':'', 'pwd':'', 'http':'', 'path':'', 'dirs':'', 'subs':'', 'prfx':'', 'nums':'', 'sufx':'' }
configs = [ 'maxp','tmp','usr','pwd','http','path','dirs','subs','prfx','nums','sufx' ]
config_file = '~/.config/sarrasemina/parallel_downloader.conf'

# ------------------------------------------------------------------------------------
def get_config( configfile ) :
    ok = False
    path = os.path.join( os.path.expanduser(configfile) )
    try:
        f = open(path, 'r')
        for line in f.readlines():
            words = line.split()
            if( len(words) >= 1 ):
                if words[0] in configs :
                    config[ words[0] ] = words[1]
                    print( '   {:>15} [{}]'.format(colr(words[0],YL),colr(words[1],RD)) )
                #ok = self.wget_config(urlstr,path,remote_config_url=True)
        f.close()

    except :
        print( ' {} [{}]'.format(colr('An error happened with config file',YL),colr(path,RD)) )
        os._exit(0)
    
    return ok

get_config( config_file )
config = SimpleNamespace( **config )

# ---------------
tmp = config.tmp    # destination download directory

usr = config.usr    # user name & password
pwd = config.pwd

# top level directory
www = config.http + config.path
day = config.dirs
hrs = config.subs.split(',')

# filenames building blocks: prfx +nums[n] +sufx
prfx = config.prfx
nums = config.nums.split(',')
sufx = config.sufx

maxp = config.maxp # max process in concurent parallel downloads
maxp = len(nums) # max concurent downloads in parallel - try to overload

urls = []
# populate urls with given day and filenames
for hr in hrs:
    for num in nums:
        urls.append( www +day +hr +prfx +num +sufx )

print()
print(L())
print( '\n', colr("Parallel download started at:", GR), '\n' )
print( ' - {}'                        .format( colr(getDateTimeFormatted(),BL) ) )
print( ' - {}'                        .format( colr(getDateTimeUTCFormatted(),BL) ) )
print( ' - {:>15} CPUs'               .format( colr(multiprocessing.cpu_count(),RD) ) )
print( ' - {:>15} Files to download\n'.format( colr(len(urls),RD) ) )
print(L())

# --------------------------------------------------------------------------------------

def prepare_download_folders( base_folder, day, hours ) :
    print( '\n', colr("Preparing directories to receive download files...",GR) )
    for hour in hours :
        folder = os.path.join( base_folder, day, hour )
        
        if not os.path.exists( folder ) :
            os.makedirs( folder )
            print("-> {}{}{}".format( colr(base_folder,CY), colr(day,MG), colr(hour,RD) ) )
    print()
        

# --------------------------------------------------------------------------------------
def initialize_downloads( username, password, top_url, fetch_url ) :
    print( ' {:<40}'.format( colr("Initialisation sequence... ",GR) ), end='' )
    starttime = getTime()
    
    if username != None :                          
        password_mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()                 # create a password manager - If we knew the realm, we could use it instead of None.
        password_mgr.add_password( None, top_url, username, password )                  # and add the top level url, username and password. 

        handler = urllib.request.HTTPBasicAuthHandler( password_mgr )
        opener = urllib.request.build_opener( handler )                                 # create "opener" (OpenerDirector instance)
        opener.open( fetch_url )                                                        # use the opener to fetch a URL

        # Install the opener.
        urllib.request.install_opener( opener )                                         # all calls to urllib.request.urlopen will now use our opener
    
    t = getTime() - starttime
    print( ' {:>10} sec.'.format( colr( round(t,3),RD ) ) )
    return t


# --------------------------------------------------------------------------------------
def _download( url, directory ):
    filename = url.split('/')[-1]
    localdir = os.path.join( directory, url.split('/')[-3], url.split('/')[-2] )

    filepath = os.path.join( localdir, filename )
    urlopen  = urllib.request.urlopen

    with urlopen(url) as response, open( filepath, 'wb' ) as filecopy :
        shutil.copyfileobj( response, filecopy )


# --------------------------------------------------------------------------------------
def pyrallelize( url_list, directory='' ):
    if isinstance( url_list, list ):
        p = Pool( len(url_list) )
        p.map( partial( _download, directory=directory ), url_list )
        p.close()                                                                       # about close() and join(), see:
        p.join()                                                                        # http://cslocumwx.github.io/blog/2015/02/23/python-multiprocessing/
    elif isinstance( url_list, str ):
        _download( url_list, directory )
    else:
        raise TypeError()

# ------------------------------------------------------------------------------------
def downloads_files( urls, into_dir ):
    u_start = 0
    num_url = len( urls )
    tt = 0
    while u_start < num_url :
        u_stop  = min( u_start + maxp, num_url )
        batch   = urls[ u_start : u_stop ]
        
        print( colr( '\n Batch download in progress of {} files...\n  '.format(maxp),YL ) + colr( '\n  '.join(batch),CY ) )
        starttime = getTime()
        
        try:
            pyrallelize( batch, into_dir )
            time.sleep(.01)
        except TypeError as e:
            print( ' Caught TypeError while atempting to download {} files ({} to {})'.format(maxp, u_start, u_stop) )
            print( '-'*100 )
            print( e )
            print( '-'*100 )
            #traceback.print_exc()
            pass
            #print('-'*150)
            #raise e
        
        t = getTime() - starttime
        tt+= t
        print( colr(' Batch download completed in',GR), '{:>10} sec. ({})'.format( colr( round(t,3),RD ), colr( getElapsedTime( round(t,3) ),RD ) ) )
        
        u_start = u_stop

    return tt
    

# ------------------------------------------------------------------------------------

prepare_download_folders( tmp, day, hrs )

tottime  = initialize_downloads( usr, pwd, www, www+day )
tottime += downloads_files( urls, tmp )

print(L())
print( '\n', colr("Parallel download finished at:", GR), '\n' )
print( ' Local Date          : {}'.format( colr(getDateTimeFormatted(),BL) ) )
print( ' UTC Date            : {}'.format( colr(getDateTimeUTCFormatted(),BL) ) )
print( ' Total download time : {}'.format( colr( getElapsedTime( round(tottime,3) ),YL ) ) )
print( ' Average time        : {} sec./file'.format( colr( round( tottime/len(urls), 3 ),RD ) ) )
print(L())

# ------------------------------------------------------------------------------------


