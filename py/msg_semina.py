#!/usr/bin/python3

class Msg_Semina(object): 

    def __init__(self,parent):
        pass

    def on_message(self,parent):

        #parent.logger.info("%12d /%s" % (parent.msg.filesize,parent.msg.relpath))
        parent.logger.info('{} {}'.format(parent.msg.relpath, parent.msg.filesize))

       
        return False

self.plugin='Msg_Semina'
