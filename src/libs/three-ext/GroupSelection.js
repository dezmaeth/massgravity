/**
 * Created by maeth on 10/17/15.
 */

THREE.GroupSelection = function ( object ,domElement) {

    this.object = object;
    this.domElement = ( domElement !== undefined ) ? domElement : document;


    // Selection box configuration
    var selectionDiv = document.createElement('div');
    selectionDiv.className = 'selection-box';
    selectionDiv.style.position = 'absolute';


    // Set to false to disable this control
    this.enabled = true;
    var STATE = { NONE: -1, DRAG: 1, END: 0 };
    var mouseButtonsBinding = { drag: 0, rotate: 1};
    var state = STATE.NONE;
    var dragStartPosition = { x: 0 , y: 0 };


    // events
    var changeEvent = { type: 'change' };
    var startEvent = { type: 'start'};
    var endEvent = { type: 'end'};

    ////////////
    // internals

    var scope = this;

    this.getElements = function () {
        //@todo : get all elements to coords

    };

    this.update = function( event ) {

        //selectionDiv.style.top = (event.clientY - 5) + 'px';
        var x = Math.min(dragStartPosition.x, event.clientX);
        var y = Math.min(dragStartPosition.y, event.clientY);

        // Calculate the width and height of the rectangle
        var width = Math.abs(event.clientX - dragStartPosition.x);
        var height = Math.abs(event.clientY - dragStartPosition.y);

        selectionDiv.style.top = y + 'px';
        selectionDiv.style.left = x + 'px';
        selectionDiv.style.width = width + 'px';
        selectionDiv.style.height = height + 'px';

        //this.dispatchEvent( changeEvent );
    };

    function dragStart ( event ) {

        if ( scope.enabled === false ) return;

        if ( event.button === mouseButtonsBinding.drag ) {

            state = STATE.DRAG;

            dragStartPosition.x = event.clientX + 5;
            dragStartPosition.y = event.clientY - 5;
            selectionDiv.style.left  = (event.clientX + 5) + 'px';
            selectionDiv.style.top = (event.clientY - 5) + 'px';
            selectionDiv.style.width = '0px';
            selectionDiv.style.height = '0px';

            document.body.appendChild(selectionDiv);
        }

        //this.dispatchEvent( startEvent );
    }

    function dragEnd ( event ) {

        state = STATE.END;
        document.body.removeChild(selectionDiv);
        dragStartPosition.x = 0;
        dragStartPosition.y = 0;
       // this.dispatchEvent( endEvent );
    }

    function dragListener(event) {
        if ( scope.enabled === false) return;

        event.stopPropagation();

       if ( state > 0 ) scope.update( event );
    }


    scope.domElement.addEventListener( 'mousedown', dragStart, false );
    scope.domElement.addEventListener( 'mousemove', dragListener, false );
    scope.domElement.addEventListener( 'mouseup', dragEnd, false);
};

THREE.GroupSelection.prototype = Object.create( THREE.EventDispatcher.prototype );