#!/usr/bin/env python3

# ------------------------------------------------------------------------------------
# IMPORTS
# ------------------------------------------------------------------------------------

import array, copy, fnmatch, os, math, shutil, stat, sys
from sarra_utils import *

# ------------------------------------------------------------------------------------
# INIT VARS
# ------------------------------------------------------------------------------------

my           = {}
documents    = {}
t_dir        = '/tmp/_data/'
withLinks    = True
withoutLinks = False

if __name__ == '__main__':
    path     = sys.argv[1] if len(sys.argv) > 1 else '.'
    t_dir    = sys.argv[2] if len(sys.argv) > 2 else t_dir
    
directory    = os.path.abspath( path )
norme        = os.path.basename(os.path.normpath( directory ))
dirBase      = '/'.join(directory.split('/')[:-1])
stripAbs     = len(dirBase)
#print( '\npath[{}]\ndir [{}]\nbase[{}]\nname[{}]\nnorm[{}]\n'.format(path,directory,dirBase,norme,directory[stripAbs:]) )

t_cat        = t_dir + 'catalogue.toc'
t_log        = t_dir + 'catalogue.log'
t_jsn        = t_dir + 'catalogue.json'

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

def writeDocumentsFiles( sortedPaths ):
    
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
    sep       = ',\n'
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

def walkInn(folder, includeLinkFiles=True):
    
    """ ______________________________________________________________________________
    
        Walk in selected folder and build the catalogue
        - Default: include linked files
        > return time it consumes to do so
        ______________________________________________________________________________
    """

    print( L() )
    print( 'Walking  path     {}\nRelative path     {}\nOutput catalogues  {}\nPlease wait...     (it may take a few minutes)'.format(colr(folder,BL), colr(folder[stripAbs:],GR), colr(t_dir,RD)) )

    # build dictionary
    buildtime   = buildDocuments(folder, includeLinkFiles)
    
    # sort keys
    starttime   = getTime()
    sortedPaths = sorted( documents.keys() )
    sorttime    = getTime() - starttime
    
    # write files
    writetime   = writeDocumentsFiles( sortedPaths )
    
    # show feedback
    norme = folder[stripAbs:]
    print( L() )
    print('\nDone!\n\n{}\nLocation: [{}]'.format( L(), colr(folder,BL) ))
    print('Relative: [{}]\n'.format(colr(norme,GR)))
    print('           {} Folders, {} files\n'.format(documents[norme]['D'],documents[norme]['F']))
    print('Size:      {} ({}B)'.format(sizeof_fmt(documents[norme]['TS'],''),num_fmt(documents[norme]['TS'])))
    print('           {} files, {} sub-folders'.format(documents[norme]['TF'],documents[norme]['TD']))
    print('\nTime:      Build {:.2f}s, Sort {:.2f}s, Write {:.2f}s'.format(buildtime,sorttime,writetime))
    print( L() )


# ------------------------------------------------------------------------------------
# RUN
# ------------------------------------------------------------------------------------

walkInn( directory, withoutLinks )

# ------------------------------------------------------------------------------------
# ### THE END ###
# ------------------------------------------------------------------------------------
