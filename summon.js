



//=============================================================================

function addEventListener(obj, event, event2, callback)
{
    if (obj.addEventListener && event) {
	obj.addEventListener(event, callback, false);
    } else if (event2)
	obj.attachEvent(event2, callback);
}



// Event handler for mouse wheel event.
function calcMouseWheelDelta(event){
    var delta = 0;
    if (!event) /* For IE. */
        event = window.event;
    if (event.wheelDelta) { /* IE/Opera. */
        delta = event.wheelDelta/120;
	
        // In Opera 9, delta differs in sign as compared to IE.
        if (window.opera)
            delta = -delta;
    } else if (event.detail) { /** Mozilla case. */
        // In Mozilla, sign of delta is different than in IE.
        delta = -event.detail;
    }
    return delta;
}


//=============================================================================
// graphics primatives


function Group(children)
{
    Group.prototype.kind = "group";
    this.parent = null;
    this.children = children;

    Group.prototype.push = function push(x) {
	x.parent = this;
	this.children.push(x);
	return x;
    };

    Group.prototype.remove = function remove(x) {
	var i = this.children.indexOf(x);
	this.children.splice(i, 1);
    };
}

function Translate(x, y, children)
{
    Translate.prototype.kind = "translate";
    this.parent = null;
    this.children = children;
    this.data = [x, y];
}

function Scale(x, y, children)
{
    Scale.prototype.kind = "scale";
    this.parent = null;
    this.children = children;
    this.data = [x, y];    
}

function Rotate(r, children)
{
    Rotate.prototype.kind = "rotate";
    this.parent = null;
    this.children = children;
    this.data = [r];    
}


function Graphic(kind, data)
{
    this.kind = kind;
    this.data = data;

    Graphic.prototype.push = function push(x) {
	this.data.push(x);
    };
}

function group()
{
    return new Group(Array.prototype.slice.call(arguments));
}

function lines()
{
    return new Graphic("lines", 
		       Array.prototype.slice.call(arguments));
}

function quads()
{
    return new Graphic("quads", 
		       Array.prototype.slice.call(arguments));
}


function style(data)
{
    return {kind: "style",
	    data: data};
}

function translate(x, y)
{
    return new Translate(x, y, Array.prototype.slice.call(arguments, 2, arguments.length));
}

function scale(x, y)
{
    return new Scale(x, y, Array.prototype.slice.call(arguments, 2, arguments.length));
}

function rotate(r)
{
    return new Rotate(r, Array.prototype.slice.call(arguments, 1, arguments.length));
}


// create the Summon namespace
var Summon = Summon || {


Camera: function Camera()
{
    this.trans = [0, 0];
    this.zoom = [1, 1];
    this.focus = [0, 0];
},


Canvas: function Canvas(canvas)
{
    var that = this;
    var c = canvas.getContext("2d");
    var camera = new Summon.Camera();

    // mouse info
    var mouseState = "up";
    var mousePt = [0, 0];

    // models
    this.world = group();

    // event handlers
    function test(e)
    {
        x = e.clientX - canvas.offsetLeft;
        y = e.clientY - canvas.offsetTop;
	//that.focus(x, y);

	console.log(camera.trans);
	console.log(camera.focus);

	that.draw();
    }


    function mouseMove(e)
    {
	if (mouseState == "down") {
            x = e.clientX - canvas.offsetLeft;
            y = e.clientY - canvas.offsetTop;
	    dx = x - mousePt[0];
	    dy = y - mousePt[1];
	    mousePt = [x, y];
	    camera.trans[0] += dx;
	    camera.trans[1] += dy;
	    that.draw();
	}
    }

    function mouseDown(e)
    {
        x = e.clientX - canvas.offsetLeft;
        y = e.clientY - canvas.offsetTop;

	mouseState = "down";
	mousePt = [x, y];
    }

    function mouseUp(e)
    {
	mouseState = "up";
    }


    function mouseWheel(e)
    {
	delta = calcMouseWheelDelta(e);

	if (delta) {
            x = e.clientX - canvas.offsetLeft;
            y = e.clientY - canvas.offsetTop;
	    pt = windowToWorld(x, y);
	    that.focus(pt[0], pt[1]);

	    var zoom = 1.0;
	    if (delta > 0)
		zoom = Math.pow(1.1, delta);
	    else
		zoom = 1.0 / Math.pow(1.1, -delta);

	    if (e.shiftKey)
		that.zoom(1.0, zoom);
	    else if (e.ctrlKey)
		that.zoom(zoom, 1.0);
	    else
		that.zoom(zoom, zoom);
	    that.draw();
	}

        // Prevent default actions caused by mouse wheel.
        if (e.preventDefault)
            e.preventDefault();
	e.returnValue = false;
    }

    
    //======================================================================
    
    function windowToWorld(x, y)
    {
	return [(x - camera.trans[0] - camera.focus[0]) / camera.zoom[0] +
		camera.focus[0],
		(y - camera.trans[1] - camera.focus[1]) / camera.zoom[1] +
		camera.focus[1]];
    }


    //======================================================================
    // drawing methods

    function transformWorld()
    {
	c.lineWidth = 1 / Math.max(camera.zoom[0], camera.zoom[1]);

	// perform translation
	c.translate(camera.trans[0], camera.trans[1]);
	
	// perform zoom with respect to focus point
	c.translate(camera.focus[0], camera.focus[1]);
	c.scale(camera.zoom[0], camera.zoom[1]);
	c.translate(-camera.focus[0], -camera.focus[1]);
    }

    function getCameraTransmat()
    {	    
	var transmat = makeIdentityMatrix();

	// perform translation
	transmat = multTransMatrix(transmat, camera.trans[0], camera.trans[1]);
	
	// perform zoom with respect to focus point
	transmat = multTransMatrix(transmat, camera.focus[0], camera.focus[1]);
	transmat = multScaleMatrix(transmat, camera.zoom[0], camera.zoom[1]);
	transmat = multTransMatrix(transmat, -camera.focus[0], -camera.focus[1]);
	return transmat;
    }


    //======================================================================
    // public methods
    this.clear = function() {
	c.clearRect(0, 0, canvas.width, canvas.height);
    }

    this.add = function(grp) {
	that.world.push(grp);
	return grp;
    }

    this.remove = function(grp) {
	parent = grp.parent;
	parent.remove(grp);
    }

    this.draw = function() {
	that.clear();

	c.save();
	//transformWorld();

	Summon.drawElements(c, that.world, getCameraTransmat());
	c.restore();
    }


    this.translate = function(x, y) {
	camera.trans[0] -= x;
	camera.trans[1] -= y;
    }

    this.zoom = function(x, y) {
	camera.zoom[0] *= x;
	camera.zoom[1] *= y;
    }

    this.focus = function(x, y) {
	camera.trans[0] += (camera.focus[0]-x) * (1.0 - camera.zoom[0]);
	camera.trans[1] += (camera.focus[1]-y) * (1.0 - camera.zoom[1]);
	camera.focus[0] = x;
	camera.focus[1] = y;
    }

    // init
    //addEventListener(canvas, "click", "onclick", test)
    addEventListener(canvas, "mousemove", "onmousemove", mouseMove)
    addEventListener(canvas, "mousedown", "onmousedown", mouseDown)
    addEventListener(canvas, "mouseup", "onmouseup", mouseUp)
    addEventListener(canvas, "DOMMouseScroll", "onmousewheel", mouseWheel)
    addEventListener(canvas, "mousewheel", "", mouseWheel)
    c.strokeStyle = c.fillStyle = "black";
},



// Draws group of elements 'grp' on a context 'c'
drawElements: function drawElements(c, grp, transmat)
{

    var elm = grp.kind;
    var v;
    var m = transmat;
    var m0, m1, m2, m3, m4, m5;
    if (!transmat) {
	transmat = makeIdentityMatrix();
    }


    if (elm == "group") {
	c.save();
	for (var i=0; i<grp.children.length; i++)
	    drawElements(c, grp.children[i], transmat);
	c.restore();
    }

    // graphical elements
    else if (elm == "lines") {
        c.beginPath();
	d = grp.data;
	m0 = m[0]; m1=m[1]; m2=m[2]; m3=m[3]; m4=m[4]; m5=m[5];	

        for (var i=0; i<d.length; i+=4) {
            c.moveTo(d[i]*m0 + d[i+1]*m1 + m2,
	             d[i]*m3 + d[i+1]*m4 + m5)
            c.lineTo(d[i+2]*m0 + d[i+3]*m1 + m2,
                     d[i+2]*m3 + d[i+3]*m4 + m5)
        }
        c.stroke();
        c.closePath();
	
    } else if (elm == "quads") {
        c.beginPath();
	d = grp.data;
        for (var i=0; i<d.length; i+=8) {
	    v = multVecMatrix(transmat, d[i], d[i+1]);
            c.moveTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i+2], d[i+3]);
            c.lineTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i+4], d[i+5]);
            c.lineTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i+6], d[i+7]);
            c.lineTo(v[0], v[1]);
	    v = multVecMatrix(transmat, d[i], d[i+1]);
            c.lineTo(v[0], v[1]);
        }
        c.fill();
        c.closePath();	

    // styles
    } else if (elm == "style") {
	for (var key in grp.data) {
	    if (key == "stroke")
		c.strokeStyle = grp.data[key];
	    else if (key == "fill")
		c.fillStyle = grp.data[key];
	}

    // transformations
    } else if (elm == "translate") {
        c.save();
	transmat2 = multTransMatrix(transmat, grp.data[0], grp.data[1]);
        //c.translate(grp.data[0], grp.data[1]);
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i], transmat2);
        c.restore();

    } else if (elm == "rotate") {
        c.save();
        c.rotate(grp.data[0] * Math.PI / 180);
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i], transmat);
        c.restore();

    } else if (elm == "scale") {
        c.save();
	transmat2 = multScaleMatrix(transmat, grp.data[0], grp.data[1]);
        //c.scale(grp.data[0], grp.data[1]);
	//c.lineWidth /= Math.min(grp.data[0], grp.data[1]);
	
        for (var i=0; i<grp.children.length; i++)
            drawElements(c, grp.children[i], transmat2);
        c.restore();


    } else {
	throw "unknown element: " + elm;
    }
},




};


/*

{

    var mouseMove = function(e)
    {
	if (mouseState == "down") {
            x = e.clientX;
            y = e.clientY;
            x -= canvas.offsetLeft;
            y -= canvas.offsetTop;
            c.lineTo(x, y);
            c.stroke();
            c.moveTo(x, y);
	}
    }

    var mouseDown = function(e)
    {
	mouseState = "down";
	c.beginPath();
	c.moveTo(e.clientX, e.clientY);
    }

    var mouseUp = function(e)
    {
	mouseState = "up";
	c.stroke();
	c.closePath();
    }


}

*/



//=============================================================================
// transforms




function makeTransMatrix(x, y)
{
    return [1, 0, x,
	    0, 1, y,
	    0, 0, 1];
}

function makeRotateMatrix(r)
{
    var s = Math.sin(r * (Math.PI/180.0));
    var c = Math.cos(r * (Math.PI/180.0));
    return [c, -s, 0,
	    s, c, 0,
	    0, 0, 1];
}

function makeScaleMatrix(x, y)
{
    return [x, 0, 0,
	    0, y, 0,
	    0 ,0, 1];
}


function makeIdentityMatrix()
{
    return [1, 0, 0,
	    0, 1, 0,
	    0, 0, 1];
}


function multMatrix(a, b)
{
/*
0 1 2
3 4 5
6 7 8
*/
    return [a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
	    a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
	    a[0]*b[2] + a[1]*b[5] + a[2]*b[8],

	    a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
	    a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
	    a[3]*b[2] + a[4]*b[5] + a[5]*b[8],

	    a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
	    a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
	    a[6]*b[2] + a[7]*b[5] + a[8]*b[8]];
}


function multTransMatrix(m, x, y)
{
/* 
   0 1 2
   3 4 5
   6 7 8

   0  1  2  3
   4  5  6  7
   8  9  10 11
   12 13 14 15
*/
    return [m[0],
	    m[1],
	    m[0]*x + m[1]*y + m[2],

	    m[3],
	    m[4],
	    m[3]*x + m[4]*y + m[5],

	    m[6],
	    m[7],
	    m[6]*x + m[7]*y + m[8]];
}



function multScaleMatrix(m, x, y)
{
/* 
   0 1 2
   3 4 5
   6 7 8
*/
    return [m[0]*x, m[1]*y, m[2],
	    m[3]*x, m[4]*y, m[5],
	    m[6]*x, m[7]*y, m[8]];
	    
}


function multVecMatrix(m, x, y)
{
/*
0 1 2
3 4 5
6 7 8
*/
    return [x*m[0] + y*m[1] + m[2],
	    x*m[3] + y*m[4] + m[5]];
}

