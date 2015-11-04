/**
 * Created by maeth on 10/17/15.
 */
/** @namespace */
var THREEx		= THREEx 		|| {};

THREEx.GroupSelection = function ( object ,domElement) {

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
    var dragEndPosition = { x: 0 , y: 0 };
    var selection = {x: 0, y:0, w: 0, h:0 };
    this.selectedObjects = [];
    this.selectableObjects= [];

    // events
    var selectedEvent = { type: 'selected_' };

    ////////////
    // internals

    var scope = this;

    function toScreenPosition(obj)
    {
        var vector = new THREE.Vector3();

        var widthHalf = 0.5 * renderer.context.canvas.width;
        var heightHalf = 0.5 * renderer.context.canvas.height;

        obj.updateMatrixWorld();
        vector.setFromMatrixPosition(obj.matrixWorld);
        vector.project(camera);

        vector.x = ( vector.x * widthHalf ) + widthHalf;
        vector.y = - ( vector.y * heightHalf ) + heightHalf;

        return {
            x: vector.x,
            y: vector.y
        };

    }

    function findBounds (pos1, pos2) {

        // calculating the origin and vector.
        var origin = {},
            delta = {};

        if (pos1.y < pos2.y) {
            origin.y = pos1.y;
            delta.y = pos2.y - pos1.y;
        } else {
            origin.y = pos2.y;
            delta.y = pos1.y - pos2.y;
        }

        if(pos1.x < pos2.x) {
            origin.x = pos1.x;
            delta.x = pos2.x - pos1.x;
        } else {
            origin.x = pos2.x;
            delta.x = pos1.x - pos2.x;
        }
        return ({ origin: origin, delta: delta });
    }

    function withinBounds(pos, bounds) {

        var ox = bounds.origin.x,
            dx = bounds.origin.x + bounds.delta.x,
            oy = bounds.origin.y,
            dy = bounds.origin.y + bounds.delta.y;

        if((pos.x >= ox) && (pos.x <= dx)) {
            if((pos.y >= oy) && (pos.y <= dy)) {
                return true;
            }
        }

        return false;
    }

    function getElements ( event ) {
        event.preventDefault();
        event.stopPropagation();

        if (camera instanceof THREE.PerspectiveCamera) {
            var bounds = findBounds(dragStartPosition,dragEndPosition);

            for (var i=0;i<scope.selectableObjects.length;i++) {
                var object = scope.selectableObjects[i];
                if (withinBounds(toScreenPosition(object),bounds)) {
                    scope.selectedObjects.push(object);
                    scope.dispatchEvent(selectedEvent + object.id);
                }
            }

        }
    }


    this.addObject = function ( object , callback ) {
        scope.addEventListener( selectedEvent + object.id, callback);
        scope.selectableObjects.push(object);
    };


    this.update = function( event ) {

        selection.x = Math.min(dragStartPosition.x, event.clientX);
        selection.y = Math.min(dragStartPosition.y, event.clientY);

        // Calculate the width and height of the rectangle
        selection.w = Math.abs(event.clientX - dragStartPosition.x);
        selection.h = Math.abs(event.clientY - dragStartPosition.y);

        selectionDiv.style.top = selection.y + 'px';
        selectionDiv.style.left = selection.x + 'px';
        selectionDiv.style.width = selection.w + 'px';
        selectionDiv.style.height = selection.h + 'px';
    };

    function dragStart ( event ) {

        if ( scope.enabled === false ) return;

        if ( event.button === mouseButtonsBinding.drag ) {

            state = STATE.DRAG;
            // refactor to function
            dragStartPosition.x = event.clientX;
            dragStartPosition.y = event.clientY;
            selectionDiv.style.left  = event.clientX + 'px';
            selectionDiv.style.top = event.clientY + 'px';
            selectionDiv.style.width = '0px';
            selectionDiv.style.height = '0px';

            document.body.appendChild(selectionDiv);
        }
    }

    function dragEnd ( event ) {

        event.preventDefault();
        event.stopPropagation();

        if (state > 0) {
            dragEndPosition.x = event.clientX;
            dragEndPosition.y = event.clientY;
            getElements( event );
            document.body.removeChild(selectionDiv);
            state = STATE.END;
        }
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

THREEx.GroupSelection.prototype = Object.create( THREE.EventDispatcher.prototype );