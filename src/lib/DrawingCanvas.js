'use strict';

const STANDARD_OPTIONS = {
    colour: '#000000',
    width: 'large',
    type: 'pen'
};

/**
 * listener to click on canvas
 * @param {Object} e - event data
 * @returns {void}
 */
function mousedownListener(e) {
    let mouseX = e.pageX - this._canvas.offsetLeft;
    let mouseY = e.pageY - this._canvas.offsetTop;

    this._paint = true;
    this._addClick(mouseX, mouseY, false);
}

/**
 * listener to move on canvas
 * @param {Object} e - event data
 * @returns {void}
 */
function mousemoveListener(e) {
    let drawingAreaX = this._width;
    let drawingAreaY = this._height;
    let drawingAreaWidth = 10;

    let mouseX = (e.changedTouches ? e.changedTouches[0].pageX : e.pageX) -
        this._canvas.offsetLeft;
    let mouseY = (e.changedTouches ? e.changedTouches[0].pageY : e.pageY) -
        this._canvas.offsetTop;
    if (mouseX < drawingAreaX && mouseY < drawingAreaY) {
        if (mouseX > drawingAreaWidth && mouseY > 0) {
            if (this._paint) {
                this._addClick(mouseX, mouseY, true);
            }
        } else {
            if (this._paint) {
                this._addClick(mouseX, mouseY, false);
            }
        }

    } else {
        if (this._paint) {
            this._addClick(mouseX, mouseY, false);
        }
    }
    // Prevent the whole page from dragging if on mobile
    e.preventDefault();
}

/**
 * listener to finishing draw on canvas
 * @returns {void}
 */
function mouseupListener() {
    this._paint = false;
}

/**
 * set click listeners on canvas
 * @returns {void}
 */
function setEventListeners() {
    this._canvas.addEventListener(
        'mousedown', mousedownListener.bind(this), false
    );
    this._canvas.addEventListener(
        'mouseup', mouseupListener.bind(this), false
    );
    this._canvas.addEventListener(
        'mousemove', mousemoveListener.bind(this), false
    );
    this._canvas.addEventListener(
        'touchstart', mousedownListener.bind(this), false
    );
    this._canvas.addEventListener(
        'touchmove', mousemoveListener.bind(this), false
    );
    this._canvas.addEventListener(
        'touchend', mouseupListener.bind(this), false
    );
}

/**
 * creates a new canvas
 * @constructor
 * @param {String} divId - div where canvas should be created
 * @param {Object} options - styling options for the canvas
 * @returns {void}
 */
let DrawingCanvas = function(divId, options) {
    this._stylingOptions = Object.assign({}, STANDARD_OPTIONS, options);
    this._canvasDiv = document.getElementById(divId);
    this._canvas = document.createElement('canvas');
    this._canvas.setAttribute('class', 'DrawingCanvas');
    // hack so that elements can be fully loaded to get attributes
    setTimeout(() => {
        this._width = this._canvasDiv.clientWidth;
        this._height = this._canvasDiv.clientHeight;
        this._canvas.setAttribute('width', this._width);
        this._canvas.setAttribute('height', this._height);
    }, 0);
    this._canvasDiv.appendChild(this._canvas);
    this._paint = false;
    setEventListeners.apply(this);
    this._context = this._canvas.getContext('2d');
    // save original context for transformations
    this._context.save();
    this._clicks = [];
    this._zoom = 0;
    this._scaleX = 1;
    this._scaleY = 1;
};

/**
 * add and draw changes to canvas
 * @param {Number} x - x coordinate
 * @param {Number} y - y coordinate
 * @param {Boolean} dragging - if point should be connected to last one
 * @returns {void}
 */
DrawingCanvas.prototype._addClick = function(x, y, dragging) {
    this._clicks.push({
        x: x/this._scaleX,
        y: y/this._scaleY,
        drag: dragging,
        style: this._stylingOptions
    });
    this._redraw();
};

DrawingCanvas.prototype._remoteUpdate = function(data) {
    this._clicks = this._clicks.concat(data.clicks);
    this._redraw();
};

DrawingCanvas.prototype._redraw = function(hard = false) {
    this._context.lineJoin = 'round';
    let radius;
    if (hard) {
        // restore original context to clear full canvas
        this._context.restore();
        this._context.clearRect(
            0, 0, this._width, this._height
        );
        // save it again for transformations
        this._context.save();
        this._context.scale(this._scaleX, this._scaleY);
        this._lastDraw = 0;
    }
    for (let i = this._lastDraw; i < this._clicks.length; i++) {
        if (this._clicks[i].style.width === 'small') {
            radius = 2;
        } else if (this._clicks[i].style.width === 'normal') {
            radius = 5;
        } else if (this._clicks[i].style.width === 'large') {
            radius = 10;
        } else if (this._clicks[i].style.width === 'huge') {
            radius = 20;
        } else {
            radius = 0;
        }
        this._context.beginPath();
        this._context.strokeStyle = this._clicks[i].style.colour;
        if (this._clicks[i].drag && i) {
            this._context.moveTo(this._clicks[i-1].x, this._clicks[i-1].y);
        } else {
            this._context.moveTo(this._clicks[i].x - 1, this._clicks[i].y);
        }
        this._context.lineTo(this._clicks[i].x, this._clicks[i].y);
        this._context.closePath();
        this._context.lineWidth = radius;
        this._context.stroke();
    }
    this._lastDraw = this._clicks.length;
};

DrawingCanvas.prototype.addImage = function(inputImg, x, y) {
    this._context.drawImage(
        inputImg, 0, 0, 100, 100, x, y, this._scaleX, this._scaleY
    );
};

DrawingCanvas.prototype.updateOptions = function(options) {
    Object.assign(this._stylingOptions, options);
};

DrawingCanvas.prototype.setZoom = function(zoom) {
    if (isNaN(zoom) || zoom < 0) {
        throw new Error('zoom must be an integer bigger than zero');
    }
    this._zoom = zoom;
    this._scaleX = 1 - this._zoom*0.1;
    this._scaleY = 1 - this._zoom*0.1;
    this._redraw(true);
};

DrawingCanvas.prototype.connectToSession = function(server) {
    server.addEventListener('update-canvas', this._remoteUpdate, this);
};

module.exports = DrawingCanvas;