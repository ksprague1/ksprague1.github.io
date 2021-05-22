
//stole this recursive thing but gonna make not recursive
function zeros(dimensions) {
    var array = [];
    for (var i = 0; i < dimensions[0]; i++) {
        var arr2= [];
        for (var j=0; j<dimensions[1];j++){
            arr2.push(0);
        }
        array.push(arr2);
    }

    return array;
}

function random_ones(dim,arr,N){
 for(var i=0;i<N;){ 
    x=Math.floor(Math.random() * dim[0]);
    y=Math.floor(Math.random() * dim[1]);
    if (arr[x][y]==0){
        arr[x][y]=1
        i++;
    }
 }
}

const gpu = new GPU();
const multiplyMatrix = gpu.createKernel(function(a, b) {
let sum = 0;
for (let i = 0; i < 8; i++) {
  sum += a[this.thread.y][i] * b[i][this.thread.x];
}
return sum;
}).setOutput([8, 8])

const add = gpu.createKernel(function(a, b) {
let s=a[this.thread.y][this.thread.x]+b[this.thread.y][this.thread.x];
return s;
}).setOutput([8, 8])

const mytest = gpu.createKernel(function(grid,J,parity) {
let s=0
if ((this.thread.x+this.thread.y)%2==parity){
s=J;
}
return s;
}).setOutput([8, 8])


console.log(1e-100)
m1 = zeros([8,8]);
m2 = zeros([8,8]);
random_ones([8,8],m1,8)
random_ones([8,8],m2,8)
out = multiplyMatrix(m1, m2)
console.log(sum(out)+"worked!")
console.log(m1);
console.log(m2);
console.log(m1);
console.log(add(m1,m2));
console.log(mytest(m1,1,0));
console.log(mytest(m1,5,1));
const SIZE = 512;
const Propose = gpu.createKernel(function(grid,JB,parity,size) {
    let i=this.thread.y
    let j=this.thread.x
    let s=grid[i][j];
    //This updates grid cells at least a little bit stochastically, the choice of 0.7 is arbitrary
    if ((i+j)%2==parity && Math.random()<0.5){
        //getting the energy
        let sum=0;
        if (i == 0) sum += grid[size-1][j]; else sum += grid[i-1][j];
        if (i == size-1) sum += grid[0][j]; else sum += grid[i+1][j];
        if (j == 0) sum += grid[i][size-1]; else sum += grid[i][j-1];
        if (j == size-1) sum += grid[i][0]; else sum += grid[i][j+1];
        let delta = 2.0 * (grid[i][j]*2-1)*(2*sum-4) ;
        //update rule for MCMC
        //I have very little trust in the GPU Math.random function
        if(delta < 0 || Math.random()<Math.exp(-JB*delta)){
        s=1-grid[i][j];
        }
    }

    return s;
}, {
        output: [SIZE, SIZE],
        pipeline: true,
        immutable: true
    });

const getval = gpu.createKernel(function(a) {
return a[this.thread.y][this.thread.x];
}).setOutput([SIZE, SIZE])
//console.log(Propose(m1,1,0,SIZE));


function sum(arr){
 sx=arr.length;
 sy=arr[0].length;
 s=0
 for (var i=0;i<sx;i++){
     for(var j=0;j<sy;j++){
      s+=arr[i][j]   
     }
 }
 return s
}

function Update(){
    n = Math.random()<=0.5?0:1
    grid=Propose(grid,1/kT,n,SIZE)
    grid=Propose(grid,1/kT,1-n,SIZE)
}




function setpixels(ctx,grid){
    var h = ctx.canvas.height;
    var w = ctx.canvas.width;
    //console.log(h/grid.length)
    scale=h/grid.length
    var imgData = ctx.getImageData(0, 0, w, h);
    var data = imgData.data;  // the array of RGBA values
    //console.log(data.length)
    for(var s = 0; s < data.length; s+=4) {
        x=Math.floor(s/4/w/scale);
        y=Math.floor(((s/4)%w)/scale)
        //s = 4 * x * w + 4 * y    probably
        data[s] = grid[x][y]*255;
        data[s + 1] = 0;//grid[x][y]*255;
        data[s + 2] = grid[x][y]*255;
        data[s + 3] = 255;  // fully opaque
    }
    ctx.putImageData(imgData, 0, 0);
}

const $ = q => document.getElementById(q);
var kT = 2.269
var mew = 0.0;
var toggle=false;
var kval1=100;
var kval2=100;
var N = 0;
var stepsperframe=1;
var startTime = 0;
var on = false;
$("steps").oninput = function() {
  stepsperframe=Math.pow(4,this.value)*2;
  if (this.value>=0){
  $('stepstext').innerHTML = Math.pow(4,this.value);
  }
  else{
  $('stepstext').innerHTML = "1/"+Math.pow(4,-this.value);
  }
}
$('stopbutton').addEventListener("click", function(){
    on = !on;
    $('stoptext').innerHTML=on? 'Stop':'Start';
    if (on){
        window.requestAnimationFrame(run);
    }
})

$("mew").oninput = function() {
  mew = this.value/5.0;
  $('mewtext').innerHTML = mew.toFixed(3);
}
    

$("kT").oninput = function() {
  x = Math.pow((this.value/32),3)+0.8194
  kT = Math.exp(x);
  $('kTtext').innerHTML = kT.toFixed(3);
  //console.log(kT);
}


function run(){
    n = Math.random()<=0.5?0:1
    grid2 = Propose(grid,1/kT,n,SIZE)
    grid = Propose(grid2,1/kT,1-n,SIZE)
    grid2.delete()
    for (var i=0;i<stepsperframe-1;i++){
        n = Math.random()<=0.5?0:1
        grid2 = Propose(grid,1/kT,n,SIZE)
        grid.delete()
        grid = Propose(grid2,1/kT,1-n,SIZE)
        grid2.delete()
    }
    n = Math.random()<=0.5?0:1
    grid2 = Propose(grid,1/kT,n,SIZE)
    grid.delete()
    grid = getval(grid2);
    grid2.delete()
    //if (Math.random()<0.01){console.log(sum(grid))}
    setpixels(ctx,grid);
    var newtime=(new Date()).getTime()
    var elapsedTime = (newtime - startTime) / 1000;// time in seconds
    startTime=newtime
    $('stepmeter').innerHTML = Number(stepsperframe/elapsedTime).toFixed(0);
    if (on){
        window.requestAnimationFrame(run);
    }
}

INDX=0
grid = zeros([SIZE,SIZE]);
random_ones([SIZE,SIZE],grid,SIZE*SIZE*2/3)
stepsperframe=Math.pow(2,-1)*2;
$('stepstext').innerHTML = "1/"+Math.pow(4,1);
var RGBData;
var NumSpecies=0;
//random_ones([128,128],grid,2000)

var canvas = document.getElementById('grid');
console.log(canvas);
ctx = canvas.getContext("2d");

setpixels(ctx,grid)

window.requestAnimationFrame(run)
