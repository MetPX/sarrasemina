#!/usr/bin/env python3

# ------------------------------------------------------------------------------------
# IMPORTS
# ------------------------------------------------------------------------------------

import array, copy, fnmatch, os, math, shutil, stat, sys
from sarra_utils import *

# ------------------------------------------------------------------------------------
# INIT VARS
# ------------------------------------------------------------------------------------

my           = {'len':0}
documents    = {}
withLinks    = True
withoutLinks = False

# --------------------------------------
# get listing file
if len(sys.argv) == 1:
    print( colr("\ncatalog_rebuilder also accepts filename in command line argument", YL) )
    filename = input( "-> Enter filename: " )
else:
    filename = sys.argv[1]

if not os.path.exists( filename ) :
    print( '\nFile {} {}.'.format(colr(filename,RD), 'does not exist') )
    print( '\nCan not proceed...' )
    sys.exit()


# ------------------------------------------------------------------------------------
f_dir    = os.path.dirname(filename) if len(os.path.dirname(filename)) > 1 else os.getcwd()
f_name   = os.path.basename(filename)
f_src    = os.path.join(f_dir, f_name)
f_base   = os.path.join(f_dir, '.'.join( f_name.split('.')[:-1] ) )
f_cat    = f_base+'.toc'
f_idx    = f_base+'.idx'
f_log    = f_base+'.log'
f_json   = f_base+'.json'
f_jsond  = f_base+'.json_dump.json'
f_root   = f_base.split('/')[-1].split('.')[0]
f_files  = f_base+'_files.txt'

urlpath  = os.path.join('http://ddi.weather.ec.gc.ca',f_root)
dic_data = { 'text':f_root, 'urlpath':urlpath, 'folders':0, 'files':0, 'size':0 }

# output files
#t_dir    = '/tmp/_data/'
t_dir    = os.path.abspath( f_base )
t_cat    = t_dir + '.toc'
t_idx    = t_dir + '.idx'
t_jsn    = t_dir + '.json'


# ------------------------------------------------------------------------------------
print(L())

print("\n  Starting parser\n\n  input:\n{:>15} {}\n\n  output:\n{:>15} {}\n{:>15} {}\n{:>15} {}\n".format('filename',colr(filename,GR), 't_cat  ', colr(t_cat,GR), 't_idx  ', colr(t_idx,GR), 't_jsn  ', colr(t_jsn,GR)) )

#print( '{:>15} {}'.format('f_src  ', colr( f_src, GR) ), ' (f_data)')
#print( '{:>15} {}'.format('f_base ', colr( f_base, YL) ))
#print( '{:>15} {}'.format('f_cat  ', colr( f_cat, GR) ))
#print( '{:>15} {}'.format('f_idx  ', colr( f_idx, GR) ))
#print( '{:>15} {}'.format('f_log  ', colr( f_log, GR) ))
#print( '{:>15} {}'.format('f_json ', colr( f_json, GR) ))
#print( '{:>15} {}'.format('f_jsond', colr( f_jsond, GR) ))
#print()
#print( '{:>15} {}'.format('f_root ', colr( f_root, GR) ))
#print( '{:>15} {}'.format('f_dir  ', colr( f_dir, GR) ))
#print()
#print( '{:>15} {}'.format('urlpath', colr( urlpath, GR) ))
print()
print(L())
# ------------------------------------------------------------------------------------

# --------------------------------------
# parse raw data and create catalogue
# --------------------------------------

# ------------------------------------------------------------------------------------
# ROUTINES
# ------------------------------------------------------------------------------------

def rebuildDocuments( fromListingFile ):

    """ ______________________________________________________________________________
    
        Re-Build documents' dictionary from a source listing file
        ______________________________________________________________________________
    """
    
    starttime  = getTime()
    totalDirs  = 0
    totalFiles = 0
    totalSize  = 0

    fD = open(f_src,'r')

    while True :
        
        line  = fD.readline()
        if line == '' : break

        words  = line.split()
        #size   = int(words[4])  # ### word position of file size in small & big ls files
        size   = int(words[2])  # ### word position of file size in medium file
        fpath  = words[-1]
        paths  = fpath.split("/")
        path   = '/'+'/'.join(paths[:-1])
        file   = paths[-1]
        
        if path not in documents:
            documents[path] = {'files':{}, 'D':0, 'F':0, 'S':0, 'R':[0,0], 'TD':0, 'TF':0, 'TS':0}
            my['len'] = max(my['len'], len(path))
        
        if file not in documents[path]['files']:
            documents[path]['files'][file] = size
            documents[path]['F']          += 1
            documents[path]['S']          += size
        
        #documents[path]['F']  += 1
        documents[path]['TF'] += 1
        documents[path]['TS'] += size

    fD.close()


    starttime = getTime()
    sortedPaths = sorted( documents.keys() )
    sorttime = getTime() - starttime

    # -> return time it it took to build documents
    return getTime() - starttime


# ------------------------------------------------------------------------------------

def writeDocumentsFiles( sortedPaths ):
    
    """ ______________________________________________________________________________
    
        Write documents' catalogue, index and json files
        ______________________________________________________________________________
    """
    
    starttime = getTime()
    
    fC = open(t_cat,'w+')
    fI = open(t_idx,'w+')
    fJ = open(t_jsn,'w+')
    fJ.write( '[\n' )

    firstPass = True
    byte_stop = 0
    sep       = ',\n'
    n         = 0
    
    for path in sortedPaths :
        sortedFiles = sorted( documents[path]['files'] )
        byte_start  = byte_stop
            
        fI.write( '{:<{wp}} [{:>3}][{:>3}][{}'.format(path, documents[path]['D'], len(documents[path]['files']), byte_stop,wp=my['len']) )
        documents[path]['R'][0] = byte_stop

        for file in sortedFiles:
            file_info = '{:>11} {}/{}'.format(documents[path]['files'][file], path, file)
        
            byte_stop += len(file_info)
            documents[path]['R'][1] = byte_stop
            byte_stop += 1
            #print('{:<120} {}'.format(file_info, documents[path]['R']))
            fC.write( '{}\n'.format(file_info) )
            
        if documents[path]['R'][1] == 0:
            fI.write( ',{}]x\n'.format(byte_stop) )
        else:
            fI.write( ',{}]\n'.format(documents[path]['R'][1]) )
        #fJ.write( '{},S={}", "children":[]'.format(documents[path]['R'][1], documents[folder]['TS']) )
        
        if firstPass:
            firstPass = False
            fJ.write( '{' )
        else:
            fJ.write( ',\n{' )
        n += 1
        fJ.write( '"title":"{0}", "info":[{2},{3},{4},{5},{6}]'.format(path, n, documents[path]['D'], documents[path]['F'], documents[path]['R'][0], documents[path]['R'][1], documents[path]['S']) )
        #fJ.write( '"title":"{0}", "folder": true, "info":[{2},{3},{4},{5},{6},{7},{8},{9}]'.format(path, n, documents[path]['D'], documents[path]['F'], documents[path]['R'][0], documents[path]['R'][1], documents[path]['S'], documents[path]['TD'], documents[path]['TF'], documents[path]['TS']) )
        fJ.write( '}' )
    
    fC.close()
    fI.close()
    
    fJ.write( '\n]' )
    fJ.close()

    # -> return time it it took to write documents to files
    return getTime() - starttime


# ------------------------------------------------------------------------------------

def parseListing(file):
    
    """ _______________________________________________________
    
         Parse file listing and rebuild the catalogue from it
        _______________________________________________________
    """
    
    #print(' - Parsing file {}\nPlease wait...    (it may take a few minutes)'.format(colr(file,GR)))
    print( '\n  - Parsing\n{:>15} {}\n{:>15} {}'.format('file',colr(f_src,GR), 'size',colr(file_size(filename),GR)) )
    print( '\n  - Writing catalogue\n{:>15} {}\n'.format('file',colr(f_cat,YL)) )
    
    # rebuild documents dictionary
    buildtime = rebuildDocuments(file)
    
    # sort documents keys
    starttime = getTime()
    sortedPaths = sorted( documents.keys() )
    sorttime = getTime() - starttime
    
    # write to files
    writetime = writeDocumentsFiles( sortedPaths )
    
    print(L())
    #print('\nDone!\n\n{}\nLocation:  {}'.format( L(), colr(folder,BL) ))
    #print('           {} Folders, {} files\n'.format(documents[folder]['D'],documents[folder]['F']))
    #print('Size:      {} ({}B)'.format(sizeof_fmt(documents[folder]['TS'],''),num_fmt(documents[folder]['TS'])))
    #print('           {} files, {} sub-folders'.format(documents[folder]['TF'],documents[folder]['TD']))
    
    print('\nTime:      Build {:.2f}s, Sort {:.2f}s, Write {:.2f}s\n'.format(buildtime,sorttime,writetime))
    print(L())

# ------------------------------------------------------------------------------------
# EXECUTE
# ------------------------------------------------------------------------------------
# ### EMERGENCY STOP ### #
#exit()
# ### EMERGENCY STOP ### #


documentsList = os.path.abspath( filename )
parseListing( documentsList )

# ------------------------------------------------------------------------------------
# ### THE END ###
# ------------------------------------------------------------------------------------
