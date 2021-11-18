// GLOBAL VARIABLES

window.onload = init;

numPoints = 0;
points = [];

var step = -1;
var delaunay;

var wait = 1000;
var graphChoice = "none";

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// POINT CLASS

class point {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.id = "vertex-" + id;
    }
}

function equalPoint(p1, p2) {
    if (p1 == null || p2 == null)
        return false;
    return p1.x == p2.x && p1.y == p2.y;
}

function distance(p1, p2) {
    return ((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y))
}

// EDGE CLASS

class edge {
    constructor(point1, point2) {
        if (point1.x > point2.x || (point1.x == point2.x && point1.y > point2.y)) {
            var p = point1;
            point1 = point2;
            point2 = p;
        }
        this.start = point1;
        this.end = point2;
        this.id = "edge-" + point1.id + "-" + point2.id;
    }

    printEdge() {
        var line = drawline(this.start, this.end);
        line.classList.add("delaunay");
    }

    eraseEdge() {
        document.getElementById(this.id).remove();
    }

    vertex(p) {
        return equalPoint(this.start, p) || equalPoint(this.end, p);
    }

    intersects(p1, p2) {
        return isIntersecting(this.start, this.end, p1, p2);
    }
}

function CCW(p1, p2, p3) {
    if ((p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x))
        return 1;
    else if ((p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x))
        return 0;
    else return -1;
}

function isIntersecting(p1, p2, p3, p4) {
    return (CCW(p1, p3, p4) != CCW(p2, p3, p4)) && (CCW(p1, p2, p3) != CCW(p1, p2, p4));
}

function equalEdge(e1, e2) {
    if (e1 == null || e2 == null)
        return false;
    return equalPoint(e1.start, e2.start) && equalPoint(e1.end, e2.end);
}

// TRIANGLE CLASS

class triangle {
    constructor(p1, p2, p3) {
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.edges = [new edge(p1, p2), new edge(p2, p3), new edge(p3, p1)];
        this.neighbours = [{ triangle: null, edge: this.edges[0] }, { triangle: null, edge: this.edges[1] }, { triangle: null, edge: this.edges[2] }];
        this.circle = new circle(p1, p2, p3);
        this.visited = 0;
    }
    getEdges() {
        return this.edges;
    }

    getNeighbours() {
        return this.neighbours;
    }

    addNeighbour(t, e) {
        var i;
        for (i = 0; i < 3; i++) {
            if (equalEdge(e, this.neighbours[i].edge)) {
                this.neighbours.splice(i, 1);
                break;
            }
        }
        this.neighbours.push({ triangle: t, edge: e });
    }

    removeNeighbour(t) {
        var i;
        for (i = 0; i < 3; i++) {
            if (equalTriangle(t, this.neighbours[i].triangle)) {
                this.neighbours.splice(i, 1);
                break;
            }
        }
    }

    contains(point) {
        if (this.visited)
            return false;
        return this.circle.radius >= distance(point, this.circle.center);
    }

    printTriangle() {
        this.edges[0].printEdge();
        this.edges[1].printEdge();
        this.edges[2].printEdge();
    }

    vertex(p) {
        return equalPoint(this.p1, p) || equalPoint(this.p2, p) || equalPoint(this.p3, p);
    }

    eraseTriangle() {
        this.edges[0].eraseEdge();
        this.edges[1].eraseEdge();
        this.edges[2].eraseEdge();
    }

    intersects(p1, p2) {
        return (this.edges[0].intersects(p1, p2)) ||
            (this.edges[1].intersects(p1, p2)) ||
            (this.edges[2].intersects(p1, p2))
    }

    inSector(v, p) {
        if (CCW(p, this.p1, this.p2) * CCW(p, this.p2, this.p3) == 1 && this.edges[2].intersects(v, p) && !this.edges[2].vertex(v)) {
            return true;
        } else if (CCW(p, this.p2, this.p1) * CCW(p, this.p1, this.p3) == 1 && this.edges[1].intersects(v, p) && !this.edges[1].vertex(v)) {
            return true;
        } else if (CCW(p, this.p2, this.p3) * CCW(p, this.p3, this.p1) == 1 && this.edges[0].intersects(v, p) && !this.edges[0].vertex(v)) {
            return true;
        } else return false;
    }
}


function equalTriangle(t1, t2) {
    if (t1 == null || t2 == null)
        return false;
    return equalCircle(t1.circle, t2.circle);
}

function commonEdge(t1, t2) {
    var i, j;
    e1 = t1.getEdges();
    e2 = t2.getEdges();
    for (i = 0; i < 3; i++) {
        for (j = 0; j < 3; j++) {
            if (equalEdge(e1[i], e2[j]))
                return e1[i];
        }
    }
    return null;
}

function distanceTP(t, p) {
    return Math.min(Math.min(distance(t.p1, p), distance(t.p2, p)), distance(t.p3, p));
}

// CIRCLE CLASS 

class circle {
    constructor(p1, p2, p3) {
        var A1 = p2.x - p1.x; // A1*x + B1*y = C1 - perpendicular bisector 1
        var B1 = p2.y - p1.y;
        var C1 = (p1.x + p2.x) / 2 * A1 + (p1.y + p2.y) / 2 * B1;

        var A2 = p3.x - p1.x; // A2*x + B2*y = C2 - perpendicular bisector 2
        var B2 = p3.y - p1.y;
        var C2 = (p1.x + p3.x) / 2 * A2 + (p1.y + p3.y) / 2 * B2;

        var det = A1 * B2 - A2 * B1;

        this.center = new point((B2 * C1 - B1 * C2) / det, (A1 * C2 - A2 * C1) / det, 0);
        this.radius = distance(this.center, p1);
    }
}

function equalCircle(c1, c2) {
    if (c1 == null || c2 == null)
        return false;
    return c1.radius == c2.radius && equalPoint(c1.center, c2.center);
}

// DELAUNAY CLASS

class triangulation {
    constructor(pointList, width, height) {
        this.pointList = pointList;
        this.width = width;
        this.height = height;
        this.triangleList = [];
        // Add super triangle
        this.s1 = new point(-this.width, -this.height, 1000);
        this.s2 = new point(this.width * 2 + 1, -this.height, 1001);
        this.s3 = new point(-this.width, this.height * 2 + 1, 1002);

        this.lastpt = this.s3;
        this.triangleList.push(new triangle(this.s1, this.s2, this.s3, null, null));
        this.lastTriList = [...this.triangleList];
        this.convexHull = [];

        shuffleArray(this.pointList);

        // this.pointList.sort(function(p1, p2) {
        //     if (p1.x < p2.x) {
        //         return -1;
        //     } else if (p1.x > p2.x) {
        //         return 1;
        //     } else return 0;
        // })
    }
    addNewPoint() {
        this.triangulate(this.pointList.length - 1);
    }

    triangulate(i) {
        console.log("Triangulate", i);
        var j;
        var curPoint = this.pointList[i];
        var containingTri = null;


        var nn_line = drawline(this.lastpt, curPoint);
        nn_line.style.backgroundColor = 'grey';
        nn_line.style.zIndex = 2;
        nn_line.style.display = "none";
        var firstTri = null;
        var nextTri = null;

        for (j = 0; j < this.lastTriList.length; j++) {

            if (this.lastTriList[j].contains(curPoint)) {
                containingTri = this.lastTriList[j];
                break;
            } else if (this.lastTriList[j].inSector(this.lastpt, curPoint)) {
                nextTri = this.lastTriList[j];
                break;

            }
        }
        firstTri = nextTri;

        var prevTri = null;

        while (containingTri == null) {
            if (firstTri == null)
                return;
            console.log("firstTri", firstTri.p1.id, firstTri.p2.id, firstTri.p3.id);
            var neighbours = firstTri.getNeighbours();
            nextTri = null;
            for (j = 0; j < 3; j++) {
                if (neighbours[j].triangle == null || equalTriangle(neighbours[j].triangle, prevTri))
                    continue;
                if (neighbours[j].triangle.contains(curPoint)) {
                    containingTri = neighbours[j].triangle;
                    break;
                } else if (neighbours[j].edge.intersects(this.lastpt, curPoint) && !neighbours[j].edge.vertex(this.lastpt)) {
                    nextTri = neighbours[j].triangle;
                }

            }
            prevTri = firstTri;
            firstTri = nextTri;
        }

        var triangleQueue = [{
            triangle: containingTri,
            edge: null
        }];
        containingTri.visited = 1;

        var edgestoremove = [];
        var trianglestoremove = [containingTri];
        var edgestoadd = [];
        var trianglestoadd = [];
        var circles = [containingTri.circle];

        for (j = 0; j < triangleQueue.length; j++) {
            var neighbours = triangleQueue[j].triangle.getNeighbours();
            var k;
            for (k = 0; k < neighbours.length; k++) {
                if (neighbours[k].triangle != null && neighbours[k].triangle.visited == 0 && neighbours[k].triangle.contains(curPoint)) {
                    triangleQueue.push(neighbours[k]);
                    neighbours[k].triangle.visited = 1;
                    edgestoremove.push(neighbours[k].edge);
                    trianglestoremove.push(neighbours[k].triangle);
                    circles.push(neighbours[k].triangle.circle);
                } else if (neighbours[k].triangle == null || neighbours[k].triangle.visited == 0) {
                    edgestoadd.push(neighbours[k].edge);
                    var newTri = new triangle(neighbours[k].edge.start, neighbours[k].edge.end, curPoint);
                    newTri.addNeighbour(neighbours[k].triangle, neighbours[k].edge);
                    trianglestoadd.push(newTri);
                    if (neighbours[k].triangle != null) {
                        neighbours[k].triangle.removeNeighbour(triangleQueue[j]);
                        neighbours[k].triangle.addNeighbour(newTri, neighbours[k].edge);
                    }
                }
            }
        }

        this.lastpt = curPoint;
        this.lastTriList = [...trianglestoadd];

        setTimeout(showCircles, (wait / 10) * 3);
        setTimeout(showBadEdges, (wait / 10) * 5);
        setTimeout(callModify, (wait / 10) * 9);

        function showCircles() {
            for (j = 0; j < circles.length; j++) {
                var radius = Math.sqrt(circles[j].radius);
                var circleDiv = document.createElement("div");
                circleDiv.className = "circle";
                circleDiv.style.height = 2 * radius + "px";
                circleDiv.style.width = 2 * radius + "px";
                circleDiv.style.top = circles[j].center.y - radius + "px";
                circleDiv.style.left = circles[j].center.x - radius + "px";
                document.body.append(circleDiv);
            }
        }

        function showBadEdges() {
            for (j = 0; j < edgestoremove.length; j++) {
                var badedge = document.getElementById(edgestoremove[j].id);
                if (badedge != null) {
                    badedge.style.backgroundColor = "red";
                    badedge.style.zIndex = 2;
                }
            }
            for (j = 0; j < edgestoadd.length; j++) {
                var badedge = document.getElementById(edgestoadd[j].id);
                if (badedge != null) {
                    badedge.style.backgroundColor = "maroon";
                    badedge.style.zIndex = 2;
                }
            }
        }

        var triangleList = this.triangleList;
        var s1 = this.s1;
        var s2 = this.s2;
        var s3 = this.s3;

        function callModify() {
            modifyEdgeList(triangleList, trianglestoadd, s1, s2, s3);
        }
    }
}

function modifyEdgeList(triangleList, trianglestoadd, s1, s2, s3) {
    var circleList = document.getElementsByClassName("circle");
    for (j = circleList.length - 1; j >= 0; j--) {
        circleList[j].remove();
    }

    var edgeList = document.getElementsByClassName("edge");
    for (j = edgeList.length - 1; j >= 0; j--) {
        edgeList[j].remove();
    }

    for (j = 0; j < trianglestoadd.length; j++) {
        for (k = j + 1; k < trianglestoadd.length; k++) {
            var com_edge = commonEdge(trianglestoadd[j], trianglestoadd[k]);
            if (com_edge != null) {
                trianglestoadd[j].addNeighbour(trianglestoadd[k], com_edge);
                trianglestoadd[k].addNeighbour(trianglestoadd[j], com_edge);
            }
        }
        triangleList.push(trianglestoadd[j]);
    }

    for (j = 0; j < triangleList.length; j++) {
        if (triangleList[j].visited == 0) {
            if (!(triangleList[j].vertex(s1) || triangleList[j].vertex(s2) || triangleList[j].vertex(s3))) {
                triangleList[j].printTriangle();
            }
        }
    }

    console.log("Choice: ", graphChoice);
    switch (graphChoice) {
        case "none":
            break;
        case "voronoi":
            computeVoronoi(triangleList, s1, s2, s3);
            break;
        case "convex-hull":
            computeConvexHull(triangleList, s1, s2, s3);
            break;
        default:
            break;
    }
    var button = document.getElementById("hide");
    button.innerHTML = "<img class=\"icon\" src=\"assets/icons/hide_source-white-18dp.svg\"> Hide";
}

function computeConvexHull(triangleList, s1, s2, s3) {
    for (j = 0; j < triangleList.length; j++) {
        if ((triangleList[j].vertex(s1) || triangleList[j].vertex(s2) || triangleList[j].vertex(s3)) && triangleList[j].visited == 0) {
            var edges = triangleList[j].getEdges();
            for (k = 0; k < 3; k++) {
                if (!edges[k].vertex(s1) && !edges[k].vertex(s2) && !edges[k].vertex(s3)) {
                    var line = drawline(edges[k].start, edges[k].end)
                    if (line != null) {
                        line.style.backgroundColor = "black";
                        line.style.zIndex = 2;
                        line.style.height = "1.5px";
                    }
                }
            }
        }
    }
}

function computeVoronoi(triangleList, s1, s2, s3) {
    var j, k;
    for (j = 0; j < triangleList.length; j++) {
        if (triangleList[j].visited == 1)
            continue;
        var neighbours = triangleList[j].getNeighbours();
        for (k = 0; k < 3; k++) {
            if (neighbours[k].triangle != null) {
                var line = drawline(triangleList[j].circle.center, neighbours[k].triangle.circle.center);
                line.style.backgroundColor = "black";
                line.style.zIndex = 2;
                line.style.height = "1.5px";
            }
        }
    }
}



// MAINTAINANCE FUNCTIONS

function init() {
    document.getElementById("board").addEventListener("click", addPoint);
    document.getElementById("run").style.pointerEvents = 'none';
    document.getElementById("addpoint").style.pointerEvents = 'none';
    console.log("Init called.");
}

function addPoint(event) {
    console.log("Adding point at", event.clientX, event.clientY);
    points.push(new point(event.clientX, event.clientY, numPoints));
    var pointDiv = document.createElement("div");
    pointDiv.className = "point";
    pointDiv.id = "vertex-" + numPoints++;
    pointDiv.style.left = (event.clientX - 4) + "px";
    pointDiv.style.top = (event.clientY - 4) + "px";
    document.body.append(pointDiv);
    if (step == -1) {
        document.getElementById("run").style.pointerEvents = 'auto';
        document.getElementById("run").classList.remove("disable");
    }
}

function addPoints() {
    document.getElementById("board").addEventListener("click", addNewPoint);
}

function addNewPoint(event) {
    addPoint(event);
    delaunay.addNewPoint(points[points.length - 1]);
}


function drawline(point1, point2) {
    var thickness = 2;
    x1 = point1.x;
    x2 = point2.x;
    y1 = point1.y;
    y2 = point2.y;
    var length = Math.sqrt(((x2 - x1) * (x2 - x1)) + ((y2 - y1) * (y2 - y1)));
    // center
    var cx = ((x1 + x2) / 2) - (length / 2);
    var cy = ((y1 + y2) / 2) - (thickness / 2);
    // angle
    var angle = Math.atan2((y1 - y2), (x1 - x2)) * (180 / Math.PI);
    // make hr
    var line = document.createElement("div");
    line.style.top = cy + "px";
    line.style.left = cx + "px";
    line.style.width = length + "px";
    line.style.transform = "rotate(" + angle + "deg)";
    line.className = "edge";
    line.id = "edge-" + point1.id + "-" + point2.id;
    document.body.append(line);
    return line;
}

function makeTriangulation() {
    document.getElementById("board").removeEventListener("click", addPoint);
    console.log("Triangulation called.");
    var board = document.getElementById("board");
    var height = 50000;
    var width = 50000;
    if (step == -1)
        delaunay = new triangulation(points, height, width);
    step = 0;

    var intv = setInterval(callStep, wait);

    function callStep() {
        if (step == points.length) {
            document.getElementById("addpoint").style.pointerEvents = 'auto';
            document.getElementById("addpoint").classList.remove("disable");
            clearInterval(intv);
        } else {
            delaunay.triangulate(step);
            step++;
        }
    }


    document.getElementById("run").style.pointerEvents = 'none';
    document.getElementById("run").classList.add("disable");
}

function reset() {
    document.getElementById("board").removeEventListener("click", addNewPoint);
    document.getElementById("board").addEventListener("click", addPoint);
    var pointList = document.getElementsByClassName("point");
    var i;
    for (i = pointList.length - 1; i >= 0; i--) {
        pointList[i].remove();
        numPoints--;
    }
    var edgeList = document.getElementsByClassName("edge");
    for (i = edgeList.length - 1; i >= 0; i--) {
        edgeList[i].remove();
    }
    step = -1;
    points = [];
    console.log("Reset called.");
    document.getElementById("run").style.pointerEvents = 'none';
    document.getElementById("addpoint").style.pointerEvents = 'none';
    document.getElementById("run").classList.add("disable");
    document.getElementById("addpoint").classList.add("disable");
}

function radioChange() {
    graphChoice = document.querySelector('input[name="graph-selection"]:checked').value;
    modifyEdgeList(delaunay.triangleList, [], delaunay.s1, delaunay.s2, delaunay.s3);
}

function setWait(val) {
    wait = 8000 - val;
    console.log(wait);
}

function toggleVis() {
    var delaunayEdges = document.getElementsByClassName("delaunay");
    var i;
    var button = document.getElementById("hide");
    if (delaunayEdges.length == 0)
        return;
    else if (delaunayEdges[0].classList.contains("hidden")) {
        button.innerHTML = "<img class=\"icon\" src=\"assets/icons/hide_source-white-18dp.svg\"> Hide";
    } else {
        button.innerHTML = "<img class=\"icon\" src=\"assets/icons/radio_button_unchecked-white-18dp.svg\"> Unhide";
    }
    for (i = 0; i < delaunayEdges.length; i++) {
        delaunayEdges[i].classList.toggle("hidden");
    }

}