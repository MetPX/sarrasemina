#!/usr/bin/env python3

# ------------------------------------------------------------------------------------
# IMPORTS
# ------------------------------------------------------------------------------------

import array, copy, fnmatch, os, math, shutil, stat, sys
from sarra_utils import *

VERSION = 'SarraRebuildR v0.9'
parser = argparse.ArgumentParser(prog            = 'sarra_rebuildr.py',
                                 description     = 'Parse the output of a tar -tvz arvchive file to rebuild its catalogue and content.',
                                 formatter_class = argparse.RawDescriptionHelpFormatter)
parser.add_argument('-s',              action='store',      dest='source_file',     help="Source file archive to parse")
parser.add_argument('-o',              action='store',      dest='output_folder',   help="Output folder for catalogues..........(default: /tmp/_data/)", default = '/tmp/_data/')
parser.add_argument('-c',              action='store',      dest='filesize_column', help="Which column is file size (start @ 0).(default: 4)",           default = 4)
parser.add_argument('-l', '--log',     action='store_true', dest='log',             help="Add log files to output folder........(default: none)",        default = False)
parser.add_argument('-v', '--version', action='version',    version=VERSION,        help="Show program's version number and exit")

args = parser.parse_args()
if args.output_folder[-1] != '/':
    args.output_folder = args.output_folder +'/'

print()
if len(sys.argv) < 2:
    print( '  Normal usage:      sarra_rebuildr.py [-h] [-s SOURCE_FILE] [-o OUTPUT_FOLDER] [-c] [-l] [-v]\n' )
print( '  Source file      [ {} ]'.format(colr(args.source_file,GR)))
print( '  Column file size [ {} ]'.format(colr(args.filesize_column,GR)))
print( '  Output folder    [ {} ]'.format(colr(args.output_folder,GR)))
print( '  Write logs?        {}'  .format(colr(args.log,GR if args.log else RD)))
print()

# ------------------------------------------------------------------------------------
# INIT VARS
# ------------------------------------------------------------------------------------

my           = {'len':0}
documents    = {}
withLogs     = args.log
colFileSize  = int(args.filesize_column)
withLinks    = True
withoutLinks = False
filename     = args.source_file

# --------------------------------------
# get listing file
#if len(sys.argv) == 1:
    #print( colr("\ncatalog_rebuilder also accepts filename in command line argument", YL) )
    #filename = input( "-> Enter filename: " )
#else:
    #filename = sys.argv[1]

#if not os.path.exists( filename ) :
    #print( '\nFile {} {}.'.format(colr(filename,RD), 'does not exist') )
    #print( '\nCan not proceed...' )
    #sys.exit()

if filename == None:
    filename = input( colr("  -> Enter filename: ",YL ) )

if not os.path.exists( filename ) :
    print( '\n  File [{}] {}.'.format(colr(filename,RD), 'does not exist') )
    print( '  Can not proceed...\n' )
    sys.exit()

# ------------------------------------------------------------------------------------
f_dir    = os.path.dirname(filename) if len(os.path.dirname(filename)) > 1 else os.getcwd()
f_name   = os.path.basename(filename)
f_src    = os.path.join(f_dir, f_name)
f_base   = os.path.join(f_dir, '.'.join( f_name.split('.')[:-1] ) )
f_cat    = f_base+'.toc'
f_root   = f_base.split('/')[-1].split('.')[0]

urlpath  = os.path.join('http://ddi.weather.ec.gc.ca',f_root)
dic_data = { 'text':f_root, 'urlpath':urlpath, 'folders':0, 'files':0, 'size':0 }

# output files
#t_dir    = '/tmp/_data/'
#t_dir    = os.path.abspath( f_base )
#t_cat    = t_dir + '.toc'
#t_idx    = t_dir + '.idx'
#t_jsn    = t_dir + '.json'

t_dir        = args.output_folder
t_cat        = t_dir + 'catalogue.toc'
t_jsn        = t_dir + 'catalogue.json'
t_log        = t_dir + 'catalogue.log'
t_log_paths  = t_dir + 'paths.log'
t_log_files  = t_dir + 'files.log'

# ------------------------------------------------------------------------------------
print(L())
print("\n  Starting parser\n\n  input:\n{:<20} {}\n\n  output:\n{:<20} {}\n{:<20} {}\n{:<20} {}\n".format('    filename', colr(filename,GR),'    folder', colr(t_dir,GR),'    files index', colr(t_cat,GR),'    folders index', colr(t_jsn,GR)))
if withLogs:
    print("  logs:\n{:<20} {}\n{:<20} {}\n{:<20} {}\n".format('    catalogue’s log', colr(t_log,GR),'    paths’ log', colr(t_log_paths,GR),'    files’ log', colr(t_log_files,GR)))

print()
print(L())

# ### EMERGENCY STOP ### #
#exit()
# ### EMERGENCY STOP ### #

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
        size   = int(words[colFileSize])
        #size   = int(words[4])  # ### word position of file size in small & big ls files
        #size   = int(words[2])  # ### word position of file size in medium file
        fpath  = words[-1]
        paths  = fpath.split("/")
        path   = '/'+'/'.join(paths[:-1])
        file   = paths[-1]
        
        if path not in documents:
            documents[path] = {'files':{}, 'D':0, 'F':0, 'S':0, 'R':[0,0], 'b':[0,0], 'TD':0, 'TF':0, 'TS':0}
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
    
    t_strip   = '-'*150 +'\n'
    t_title   = t_strip +'\n'+ VERSION +' Log [ {} ]\n\n'+ t_strip +'{}\n\n'+ t_strip +'\n{}\n\n'
    h_parsed  = '\n   Parsed file: {}\n   Parsed date: {}'.format( f_src, getDateTimeFormatted() )
    h_catalog = t_title.format('Paths',h_parsed,' Number of:  | catalogue\nSubDir|Files | ByteRange     | Dir ID | Paths' )
    h_paths   = t_title.format('Paths - Includes directories containing no files ("x")',h_parsed,' Number of:  | catalogue\nSubDir|Files | ByteRange     | Dir ID | Paths' )
    h_files   = t_title.format('Files',h_parsed,' Dir ID |  File Size  | Full Path')

    fC = open(t_cat,'w+')
    fJ = open(t_jsn,'w+')
    fJ.write( '[\n' )
    
    if withLogs:
        fLC = open(t_log,'w+')
        fLP = open(t_log_paths,'w+')
        fLF = open(t_log_files,'w+')
    
        fLC.write( h_catalog )
        fLP.write( h_paths )
        fLF.write( h_files )

    firstPass = True
    byte_stop = 0       # byte_stop for full paths with file name
    bit_stop  = 0       # bit_stop  for file name only
    pathNum   = -1
    oldPath   = ''
    
    for path in sortedPaths :
        sortedFiles = sorted( documents[path]['files'] )
        byte_start  = byte_stop
        documents[path]['R'][0] = byte_stop
        documents[path]['b'][0] = bit_stop
            
        for file in sortedFiles:
            if path != oldPath :
                pathNum += 1
                oldPath  = path
            file_inf  = '{}|{}|{}'              .format(pathNum, documents[path]['files'][file], file)
            file_info = '{:>7} | {:>11} | {}/{}'.format(pathNum, documents[path]['files'][file], path, file)
        
            bit_stop  += len(file_inf)
            byte_stop += len(file_info)
            documents[path]['b'][1] = bit_stop
            documents[path]['R'][1] = byte_stop
            bit_stop  += 1
            byte_stop += 1
            fC.write( '{}\n'.format(file_inf) )
            if withLogs:
                fLF.write( '{}\n'.format(file_info) )
            
        nbDirs  = documents[path]['D']
        nbFiles = len(documents[path]['files'])
        if documents[path]['R'][1] == 0:
            nbFiles    = '--'
            byte_range = '-  [{},{}]'.format(byte_start,byte_stop)
        else:
            byte_range = '   [{},{}]'.format(byte_start,documents[path]['R'][1])
            if withLogs:
                fLC.write( '{:>4}  | {:>3}{:<20} {:>5}   {}\n'.format(nbDirs, nbFiles, byte_range, pathNum, path) )
        if withLogs:
            fLP.write( '{:>4}  | {:>3}{:<20} {:>5}   {}\n'.format(nbDirs, nbFiles, byte_range, pathNum, path) )
        
        if documents[path]['F'] > 0:
            if firstPass:
                firstPass = False
                fJ.write( '{' )
            else:
                fJ.write( ',\n{' )

            fJ.write( '"inf":[{1},{2},{3},{4}],"dir":"{0}"'.format(path, documents[path]['F'], documents[path]['b'][0], documents[path]['b'][1], documents[path]['S']) +'}' )
    
    fJ.write( '\n]' )
    fJ.close()
    fC.close()
    

    if withLogs:
        fLC.close()
        fLP.close()
        fLF.close()
    
    # -> return time it it took to write documents to files
    return getTime() - starttime


# ------------------------------------------------------------------------------------

def parseListing(file):
    
    """ _______________________________________________________
    
         Parse file listing and rebuild the catalogue from it
        _______________________________________________________
    """
    
    #print(' - Parsing file {}\nPlease wait...    (it may take a few minutes)'.format(colr(file,GR)))
    print( '\n  - Parsing\n{:>15} {}\n{:>15} {}'     .format('file',colr(f_src,GR), 'size',colr(file_size(filename),GR)) )
    print( '\n  - Writing catalogue files\n{:>15} {}'.format('file',colr(t_cat,YL)) )
    print( '{:>15} {}\n'                             .format('file',colr(t_jsn,YL)) )
    if withLogs:
        print( '\n  - Writing log files\n{:>15} {}'  .format('file',colr(t_log,MG)) )
        print( '{:>15} {}'                           .format('file',colr(t_log_files,MG)) )
        print( '{:>15} {}'                           .format('file',colr(t_log_paths,MG)) )
        
    print('...\n')
    
    # rebuild documents dictionary
    buildtime = rebuildDocuments(file)
    
    # sort documents keys
    starttime = getTime()
    sortedPaths = sorted( documents.keys() )
    sorttime = getTime() - starttime
    
    # write to files
    writetime = writeDocumentsFiles( sortedPaths )
    
    print(L())
    print()
    print('  Done!\n\n  - Times')
    print('           Build {:.2f}s'  .format(buildtime))
    print('           Sort  {:.2f}s'  .format(sorttime))
    print('           Write {:.2f}s\n'.format(writetime))
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
