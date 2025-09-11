def handle: inputs ;
def process: try handle catch ("invalid json", process) ;
process
