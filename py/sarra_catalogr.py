#!/usr/bin/env python3

# ------------------------------------------------------------------------------------
# IMPORTS
# ------------------------------------------------------------------------------------

import array, copy, fnmatch, os, math, shutil, stat, sys
from sarra_utils import *

# ======================================================================================
# default configs
# ======================================================================================
#default_configs = { 'dir':{'source':'./__pycache__/', 'target':'./data'} }              # default source & target directories
#default_configs = { 'dir':{'source':'.', 'target':'./data'} }                           # default source & target directories

VERSION = 'SarraCatalogR v0.9'
parser = argparse.ArgumentParser(prog            = 'sarra_catalogr.py',
                                 description     = 'Parse a directory recursively and creates a catalogue of its content.',
                                 formatter_class = argparse.RawDescriptionHelpFormatter)
parser.add_argument('-s',              action='store',      dest='source_folder', help="Source folder to parse...........(default: .)",           default = '.')
parser.add_argument('-o',              action='store',      dest='output_folder', help="Output folder for catalogues.....(default: /tmp/_data/)", default = '/tmp/_data/')
parser.add_argument('-l', '--log',     action='store_true', dest='log',           help="Add log files to output folder...(default: none)",        default = False)
parser.add_argument('-v', '--version', action='version',    version=VERSION,      help="Show program's version number and exit")

args = parser.parse_args()
if args.output_folder[-1] != '/':
    args.output_folder = args.output_folder +'/'

print()
if len(sys.argv) < 2:
    print( 'Usage:        sarra_catalogr.py [-h] [-s SOURCE_FOLDER] [-o OUTPUT_FOLDER] [-l] [-v]' )
print( 'Source folder [{}]'.format(args.source_folder))
print( 'Output folder [{}]'.format(args.output_folder))
print( 'Write logs?   {}'.format(args.log))
print()

# ------------------------------------------------------------------------------------
# INIT VARS
# ------------------------------------------------------------------------------------

my           = {}
documents    = {}
path         = args.source_folder
t_dir        = args.output_folder
withLogs     = args.log
withLinks    = True
withoutLinks = False

directory    = os.path.abspath( path )
norme        = os.path.basename(os.path.normpath( directory ))
dirBase      = '/'.join(directory.split('/')[:-1])
stripAbs     = len(dirBase)
#print( '\npath[{}]\ndir [{}]\nbase[{}]\nname[{}]\nnorm[{}]\n'.format(path,directory,dirBase,norme,directory[stripAbs:]) )

t_cat        = t_dir + 'catalogue.toc'
t_jsn        = t_dir + 'catalogue.json'
t_log        = t_dir + 'catalogue.log'
t_log_paths  = t_dir + 'paths.log'
t_log_files  = t_dir + 'files.log'

if not os.path.exists(os.path.dirname(t_cat)):
    try:
        os.makedirs(os.path.dirname(t_cat))
    except OSError as exc: # Guard against rare condition
        if exc.errno != errno.EEXIST:
            raise

# ------------------------------------------------------------------------------------
# ROUTINES
# ------------------------------------------------------------------------------------

def buildDocuments( folder, includeLinkFiles=True ):

    """ ______________________________________________________________________________
    
        Build documents' dictionary within folder
        ______________________________________________________________________________
    """
    
    starttime  = getTime()
    totalDirs  = 0
    totalFiles = 0
    totalSize  = 0
    maxLenPath = 0
    
    for (path, dirs, files) in os.walk(folder, topdown=False):
        fullpath  = os.path.abspath( path )
        stripPath = path[stripAbs:]
        #print('\n------------------\npath[{}]\nstrip[{}]\n------------------'.format(path,stripPath) )
        
        if stripPath not in documents:
            numDirs         = len(dirs)  # Number of directories 
            numFiles        = len(files) # Number of files
            totalDirs       = numDirs    # Total number of sub-directories
            totalFiles      = numFiles   # Total number of files in sub-dirs
            documents[stripPath] = {'files':{}, 'D':numDirs, 'F':numFiles, 'S':0, 'R':[0,0], 'b':[0,0], 'TD':0, 'TF':0, 'TS':0}
            maxLenPath      = max( maxLenPath, len(stripPath) )
            
        for file in files:
            try:
                if not (file.startswith('.') or "\\" in fullpath) :
                    fpath = os.path.join( fullpath, file )
                    if os.path.isfile(fpath) and (includeLinkFiles or not os.path.islink(fpath)):
                        size = os.stat(fpath).st_size
                        if file not in documents[stripPath]['files']:
                            documents[stripPath]['files'][file] = size
                        documents[stripPath]['S'] += size
                        totalSize            += size
                        #print( '       [{:>12}] {}/{}'.format(documents[path]['files'][file], path, file) )
                else:
                    documents[stripPath]['F'] -= 1
                    totalFiles                -= 1
            except OSError as error:
                continue
        
        documents[stripPath]['TS'] += totalSize
        documents[stripPath]['TF'] += totalFiles
        documents[stripPath]['TD'] += totalDirs
        #print( '{}{:>3} file(s), {:>2} sub-folder(s), {:>12} bytes, {:<55}'.format(L(),documents[path]['F'], documents[path]['D'], documents[path]['S'], path) )
    
    my['len'] = maxLenPath
    
    # it's show time!
    return getTime() - starttime


# ------------------------------------------------------------------------------------

def writeDocumentsFiles( sortedPaths ):
    
    """ ______________________________________________________________________________
    
        Write documents' catalogue, index and json files
        ______________________________________________________________________________
    """
    
    starttime = getTime()
    firstPass = True
    byte_stop = 0       # byte_stop for full paths with file name
    bit_stop  = 0       # bit_stop  for file name only
    pathNum   = -1
    oldPath   = ''
    t_strip   = '-'*150 +'\n'
    t_title   = t_strip +'\n'+ VERSION +' Log [ {} ]\n\n'+ t_strip +'{}\n\n'+ t_strip +'\n{}\n\n'
    h_scanned = '\n   Scanned Dir : {}\n   Scanned Date: {}'.format( directory, getDateTimeFormatted() )
    h_catalog = t_title.format('Paths',h_scanned,' Number of:  | catalogue\nSubDir|Files | ByteRange     | Dir ID | Paths' )
    h_paths   = t_title.format('Paths - Includes directories containing no files ("x")',h_scanned,' Number of:  | catalogue\nSubDir|Files | ByteRange     | Dir ID | Paths' )
    h_files   = t_title.format('Files',h_scanned,' Dir ID |  File Size  | Full Path')

    fC  = open(t_cat,'w+')
    fJ  = open(t_jsn,'w+')
    fJ.write( '[\n' )

    if withLogs:
        fLC = open(t_log,'w+')
        fLP = open(t_log_paths,'w+')
        fLF = open(t_log_files,'w+')
    
        fLC.write( h_catalog )
        fLP.write( h_paths )
        fLF.write( h_files )

    for path in sortedPaths :
        sortedFiles = sorted( documents[path]['files'] )
        byte_start = byte_stop
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

    # it's show time!
    return getTime() - starttime


# ------------------------------------------------------------------------------------

def buildDocumentsFullpath( folder, includeLinkFiles=True ):

    """ ______________________________________________________________________________
    
        Build documents' dictionary within folder
        ______________________________________________________________________________
    """
    
    starttime  = getTime()
    totalDirs  = 0
    totalFiles = 0
    totalSize  = 0
    maxLenPath = 0
    
    for (path, dirs, files) in os.walk(folder, topdown=False):
        fullpath  = os.path.abspath( path )
        stripPath = path[stripAbs:]
        #print('\n------------------\npath[{}]\nstrip[{}]\n------------------'.format(path,stripPath) )
        
        if stripPath not in documents:
            numDirs         = len(dirs)  # Number of directories 
            numFiles        = len(files) # Number of files
            totalDirs       = numDirs    # Total number of sub-directories
            totalFiles      = numFiles   # Total number of files in sub-dirs
            documents[stripPath] = {'files':{}, 'D':numDirs, 'F':numFiles, 'S':0, 'R':[0,0], 'TD':0, 'TF':0, 'TS':0}
            maxLenPath      = max( maxLenPath, len(stripPath) )
            
        for file in files:
            try:
                if not file.startswith('.'):
                    fpath = os.path.join( fullpath, file )
                    if os.path.isfile(fpath) and (includeLinkFiles or not os.path.islink(fpath)):
                        size = os.stat(fpath).st_size
                        if file not in documents[stripPath]['files']:
                            documents[stripPath]['files'][file] = size
                        documents[stripPath]['S'] += size
                        totalSize            += size
                        #print( '       [{:>12}] {}/{}'.format(documents[path]['files'][file], path, file) )
                else:
                    documents[stripPath]['F'] -= 1
                    totalFiles           -= 1
            except OSError as error:
                continue
        
        documents[stripPath]['TS'] += totalSize
        documents[stripPath]['TF'] += totalFiles
        documents[stripPath]['TD'] += totalDirs
        #print( '{}{:>3} file(s), {:>2} sub-folder(s), {:>12} bytes, {:<55}'.format(L(),documents[path]['F'], documents[path]['D'], documents[path]['S'], path) )
    
    my['len'] = maxLenPath
    
    # it's show time!
    return getTime() - starttime


# ------------------------------------------------------------------------------------

def writeDocumentsFilesFullpath( sortedPaths ):
    
    """ ______________________________________________________________________________
    
        Write documents' catalogue, index and json files
        ______________________________________________________________________________
    """
    
    starttime = getTime()
    
    fC = open(t_cat,'w+')
    fL = open(t_log,'w+')
    fJ = open(t_jsn,'w+')
    fJ.write( '[\n' )
                
    firstPass = True
    byte_stop = 0
    n         = 0
    
    for path in sortedPaths :
        sortedFiles = sorted( documents[path]['files'] )
        byte_start  = byte_stop
            
        fL.write( '{:<{wp}} [{:>3}][{:>3}][{}'.format(path, documents[path]['D'], len(documents[path]['files']), byte_stop,wp=my['len']) )
        documents[path]['R'][0] = byte_stop

        for file in sortedFiles:
            file_info = '{:>11} {}/{}'.format(documents[path]['files'][file], path, file)
        
            byte_stop += len(file_info)
            documents[path]['R'][1] = byte_stop
            byte_stop += 1
            #print('{:<120} {}'.format(file_info, documents[path]['R']))
            fC.write( '{}\n'.format(file_info) )
            
        if documents[path]['R'][1] == 0:
            fL.write( ',{}]x\n'.format(byte_stop) )
        else:
            fL.write( ',{}]\n'.format(documents[path]['R'][1]) )
        #fJ.write( '{},S={}", "children":[]'.format(documents[path]['R'][1], documents[folder]['TS']) )
        
        if documents[path]['F'] > 0:
            
            if firstPass:
                firstPass = False
                fJ.write( '{' )
            else:
                fJ.write( ',\n{' )
            n += 1
            
            fJ.write( '"title":"{0}", "info":[{2},{3},{4},{5},{6}]'.format(path, n, documents[path]['D'], documents[path]['F'], documents[path]['R'][0], documents[path]['R'][1], documents[path]['S']) )
            #fJ.write( '"title":"{0}", "folder": true, "info":[{2},{3},{4},{5},{6},{7},{8},{9}]'.format(path, n, documents[path]['D'], documents[path]['F'], byte_start, byte_stop, documents[path]['S'], documents[path]['TD'], documents[path]['TF'], documents[path]['TS']) )
            fJ.write( '}' )
    
    fC.close()
    fL.close()
    
    fJ.write( '\n]' )
    fJ.close()

    # it's show time!
    return getTime() - starttime


# ------------------------------------------------------------------------------------

def walkInn( folder, includeLinkFiles=True, useFullpath=False ):
    
    """ ______________________________________________________________________________
    
        Walk in selected folder and build the catalogue
        - Default: include linked files
        > return time it consumes to do so
        ______________________________________________________________________________
    """

    print( L() )
    print( 'Walking  path     {}\nRelative path     {}\nOutput catalogues {}\nPlease wait...    (may take a few minutes)'.format(colr(folder,BL), colr(folder[stripAbs:],GR), colr(t_dir,RD)) )
    if useFullpath:
        print( "Using full path..." )

    # build dictionary
    buildtime   = buildDocumentsFullpath( folder, includeLinkFiles ) if useFullpath else buildDocuments( folder, includeLinkFiles )
    
    # sort keys
    starttime   = getTime()
    sortedPaths = sorted( documents.keys() )
    sorttime    = getTime() - starttime
    
    # write files
    writetime   = writeDocumentsFilesFullpath( sortedPaths ) if useFullpath else writeDocumentsFiles( sortedPaths )
    
    # show feedback
    norme = folder[ stripAbs: ]
    print( L() )
    print( '\nDone!\n\n{}\nLocation: [{}]'.format( L(), colr(folder,BL) ) )
    print( 'Relative: [{}]\n'.format(colr(norme,GR)) )
    print( '           {} Folders, {} files\n'.format(documents[norme]['D'],documents[norme]['F']) )
    print( 'Size:      {} ({}B)'.format(sizeof_fmt(documents[norme]['TS'],''),num_fmt(documents[norme]['TS'])) )
    print( '           {} files, {} sub-folders'.format(documents[norme]['TF'],documents[norme]['TD']) )
    print( '\nTime:      Build {:.2f}s, Sort {:.2f}s, Write {:.2f}s'.format(buildtime,sorttime,writetime) )
    print( L() )


# ------------------------------------------------------------------------------------
# RUN
# ------------------------------------------------------------------------------------

walkInn( directory, withoutLinks )

# ------------------------------------------------------------------------------------
# ### THE END ###
# ------------------------------------------------------------------------------------
