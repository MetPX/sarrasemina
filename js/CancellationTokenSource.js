const CANCEL        = Symbol(),
      CANCEL_SEARCH = Symbol();

class CancellationToken {

  constructor() {
      this.cancelled       = false;
      this.cancelledSearch = false;
  }
  
  [ CANCEL ]()              { this.cancelled       = true; }
  [ CANCEL_SEARCH ]()       { this.cancelledSearch = true; }
  reset()                   {
                              this.cancelled       = false;
                              this.cancelledSearch = false;
                            }
  isCancelled()             { return this.cancelled       === true; }
  isSearchCancelled()       { return this.cancelledSearch === true; }
  throwIfCancelled()        { if( this.isCancelled() )       { throw "Cancelled"; } }
  throwIfSearchCancelled()  { if( this.isSearchCancelled() ) { throw "CancelledByUser"; } }
  
}

class CancellationTokenSource {

    constructor()   { this.token = new CancellationToken(); }
    cancel()        { this.token[ CANCEL ](); }
    cancelSearch()  { this.token[ CANCEL_SEARCH ](); }
    reset()         { this.token.reset(); }
  
}