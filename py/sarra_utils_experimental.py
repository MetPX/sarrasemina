#!/usr/bin/env python3
import argparse, locale, time, datetime
#import humanfriendly

# ------------------------------------------------------------------------------------
# UTILS

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
    return datetime.datetime.now().strftime('%Y-%m-%d - %H:%M:%S     (%A, %d %B %Y)')

def getDateTimeUTCFormatted():
    return datetime.datetime.utcnow().strftime('%Y-%m-%d - %H:%M:%S UTC (%A, %d %B %Y)')

def getElapsedTime( s ):
    return time.strftime("%H:%M:%S", time.gmtime(s))
#def getElapsedTime( s=0 ):
    #return humanfriendly.format_timespan(s)

def getElapsedSeconds( s ):
    return time.strftime("%H:%M:%S", time.gmtime(s) )

def file_size(fname):
        import os
        statinfo = os.stat(fname)
        return sizeof_fmt(statinfo.st_size)

# ------------------------------------------------------------------------------------
#"""
# Works for python 3.3+ due to use of os.get_terminal_size, print function, etc.
def progress_percentage( perc, width=None ):

    FULL_BLOCK = '█'
    INCOMPLETE_BLOCK_GRAD = ['░', '▒', '▓']  # this is a gradient of incompleteness

    assert(isinstance(perc, float))
    assert(0. <= perc <= 100.)
    # if width unset use full terminal
    if width is None:
        width = os.get_terminal_size().columns
    # progress bar is block_widget separator perc_widget : ####### 30%
    max_perc_widget = '[100.00%]' # 100% is max
    separator = ' '
    blocks_widget_width = width - len(separator) - len(max_perc_widget)
    assert(blocks_widget_width >= 10) # not very meaningful if not
    perc_per_block = 100.0/blocks_widget_width
    # epsilon is the sensitivity of rendering a gradient block
    epsilon = 1e-6
    # number of blocks that should be represented as complete
    full_blocks = int((perc + epsilon)/perc_per_block)
    # the rest are "incomplete"
    empty_blocks = blocks_widget_width - full_blocks

    # build blocks widget
    blocks_widget = ([FULL_BLOCK] * full_blocks)
    blocks_widget.extend([INCOMPLETE_BLOCK_GRAD[0]] * empty_blocks)
    # marginal case - remainder due to how granular our blocks are
    remainder = perc - full_blocks*perc_per_block
    # epsilon needed for rounding errors (check would be != 0.)
    # based on reminder modify first empty block shading
    # depending on remainder
    if remainder > epsilon:
        grad_index = int((len(INCOMPLETE_BLOCK_GRAD) * remainder)/perc_per_block)
        blocks_widget[full_blocks] = INCOMPLETE_BLOCK_GRAD[grad_index]

    # build perc widget
    str_perc = '%.2f' % perc
    # -1 because the percentage sign is not included
    perc_widget = '[%s%%]' % str_perc.ljust(len(max_perc_widget) - 3)

    # form progressbar
    progress_bar = '%s%s%s' % (''.join(blocks_widget), separator, perc_widget)
    # return progressbar as string
    return ''.join(progress_bar)


def copy_progress(copied, total):
    print('\r' + progress_percentage(100*copied/total, width=30), end='')


# Copy data from src to dst.
def copyfile(src, dst, *, follow_symlinks=True):
    """
    If follow_symlinks is not set and src is a symbolic link, a new
    symlink will be created instead of copying the file it points to.
    """
    if shutil._samefile(src, dst):
        raise shutil.SameFileError("{!r} and {!r} are the same file".format(src, dst))

    for fn in [src, dst]:
        try:
            st = os.stat(fn)
        except OSError:
            # File most likely does not exist
            pass
        else:
            # XXX What about other special files? (sockets, devices...)
            if shutil.stat.S_ISFIFO(st.st_mode):
                raise shutil.SpecialFileError("`%s` is a named pipe" % fn)

    if not follow_symlinks and os.path.islink(src):
        os.symlink(os.readlink(src), dst)
    else:
        size = os.stat(src).st_size
        with open(src, 'rb') as fsrc:
            with open(dst, 'wb') as fdst:
                copyfileobj(fsrc, fdst, callback=copy_progress, total=size)
    return dst


def copyfileobj(fsrc, fdst, callback, total, length=16*1024):
    copied = 0
    while True:
        buf = fsrc.read(length)
        if not buf:
            break
        fdst.write(buf)
        copied += len(buf)
        callback(copied, total=total)


def copy_with_progress(src, dst, *, follow_symlinks=True):
    if os.path.isdir(dst):
        dst = os.path.join(dst, os.path.basename(src))
    copyfile(src, dst, follow_symlinks=follow_symlinks)
    shutil.copymode(src, dst)
    return dst
#"""
# ------------------------------------------------------------------------------------
