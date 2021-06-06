
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

function ones(dimensions) {
    var array = [];
    for (var i = 0; i < dimensions[0]; i++) {
        var arr2= [];
        for (var j=0; j<dimensions[1];j++){
            arr2.push(1);
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

//going to do max test reductions



const random_arr = gpu.createKernel(function(offset){
    let i=this.thread.x
    let j=this.thread.y
    if (i>j){
        j=i+1;
        i=-this.thread.y-1
    }
    return j*j+i
}).setOutput([512, 512])


function cpumax(grid){
    var max=-999;
    //var min=999;
    for (var i=0;i<grid.length;i++){
    for (var j=0;j<grid[0].length;j++){
        if (grid[i][j]>max){max=grid[i][j]}
        //if (grid[i][j]<min){min=grid[i][j]}
    }}
    return max//,min
}

function reducemax(a) {
  let i=this.thread.x*2
  let j=this.thread.y*2
  let h1= a[i][j]>a[i][j+1]? a[i][j]:a[i][j+1]
  let h2=a[i+1][j]>a[i+1][j+1]?a[i+1][j]:a[i+1][j+1]
  return h2>h1?h2:h1
}

const m2048=  gpu.createKernel(reducemax).setOutput([1024,1024]).setPipeline(true);
const m1024 =  gpu.createKernel(reducemax).setOutput([512,512]).setPipeline(true);
const m512 =  gpu.createKernel(reducemax).setOutput([256,256]).setPipeline(true);
const m256 =  gpu.createKernel(reducemax).setOutput([128,128]).setPipeline(true);
const m128 =  gpu.createKernel(reducemax).setOutput([64,64]).setPipeline(true);
const m64 =  gpu.createKernel(reducemax).setOutput([32,32]).setPipeline(true);
const m32 =  gpu.createKernel(reducemax).setOutput([16,16]).setPipeline(true);
const m16 =  gpu.createKernel(reducemax).setOutput([8,8]).setPipeline(true);
const m8 =  gpu.createKernel(reducemax).setOutput([4,4]).setPipeline(true);
const m4 =  gpu.createKernel(reducemax).setOutput([2,2]).setPipeline(true);
const m2=  gpu.createKernel(reducemax).setOutput([1,1]).setPipeline(true);
const ret= gpu.createKernel(function(a){return a[0][0];}).setOutput([1])
function gpumax(a){
return m2(m4(m8(m16(m32(m64(m128(m256(m512(a)))))))))
}

function reducemin(a) {
  let i=this.thread.x*2
  let j=this.thread.y*2
  let h1= a[i][j]<a[i][j+1]? a[i][j]:a[i][j+1]
  let h2=a[i+1][j]<a[i+1][j+1]?a[i+1][j]:a[i+1][j+1]
  return h2<h1?h2:h1
}

const mn2048=  gpu.createKernel(reducemin).setOutput([1024,1024]).setPipeline(true);
const mn1024 =  gpu.createKernel(reducemin).setOutput([512,512]).setPipeline(true);
const mn512 =  gpu.createKernel(reducemin).setOutput([256,256]).setPipeline(true);
const mn256 =  gpu.createKernel(reducemin).setOutput([128,128]).setPipeline(true);
const mn128 =  gpu.createKernel(reducemin).setOutput([64,64]).setPipeline(true);
const mn64 =  gpu.createKernel(reducemin).setOutput([32,32]).setPipeline(true);
const mn32 =  gpu.createKernel(reducemin).setOutput([16,16]).setPipeline(true);
const mn16 =  gpu.createKernel(reducemin).setOutput([8,8]).setPipeline(true);
const mn8 =  gpu.createKernel(reducemin).setOutput([4,4]).setPipeline(true);
const mn4 =  gpu.createKernel(reducemin).setOutput([2,2]).setPipeline(true);
const mn2=  gpu.createKernel(reducemin).setOutput([1,1]).setPipeline(true);
function gpumin(a){
return mn2(mn4(mn8(mn16(mn32(mn64(mn128(mn256(mn512(a)))))))));
}

const togpularge = gpu.createKernel(function(a) {
return a[this.thread.y][this.thread.x];
},{output: [512, 512],pipeline: true,immutable: true})


testarr = random_arr(0.5)

testarrgpu=togpularge(testarr)
var startTime=(new Date()).getTime()

for (var i=0;i<1000;i++){
max = cpumax(testarr)
}

var newtime=(new Date()).getTime()
var ms = (newtime - startTime);//in ms
console.log(max + " on cpu in "+ms+' ms')

var startTime=(new Date()).getTime()

for (var i=0;i<1000;i++){
max = gpumin(testarrgpu)
}

var newtime=(new Date()).getTime()
var ms = (newtime - startTime);//in ms
console.log(ret(max) + " on gpu in "+ms+' ms')









const SIZE = 512;
const H = 0.01;
//gpu bound ising proposal using a checkorboard update rule since no neighbours lie on the
//same checkerboard
const Propose = gpu.createKernel(function(grid,JB,mew,parity,size) {
    let i=this.thread.y
    let j=this.thread.x
    let s=grid[i][j];
    //This updates grid cells at least a little bit stochastically, the choice of 0.5 is arbitrary
    //Note: if this is set to 1 you will get weirdness, probably due to the sketchy math.random function
    if ((i+j)%2==parity && Math.random()<0.5){
        //getting the energy
        
        //Apparently the gpu has PBC for days
        let sum=grid[i-1][j]+grid[i+1][j]+grid[i][j-1]+grid[i][j+1]
        let delta = 2.0 * (grid[i][j]*2-1)*(2*sum-4+mew) ;
        //update rule for MCMC
        //I have very little trust in the GPU Math.random function
        if(delta < 0 || 1-Math.random()<Math.exp(-JB*delta)){
        s=1-grid[i][j];
        }
    }

    return s;
}, {
        output: [SIZE, SIZE],
        pipeline: true,
        immutable: true
    });

const Ex = gpu.createKernel(function(V,mutable,h,size) {
    let i=this.thread.y
    let j=this.thread.x
    let ip1= (i == size-1)? 0     :i+1;
    let jp1= (j == size-1)? 0     :j+1;
    if (mutable[i][j]+mutable[ip1][j]+mutable[i][jp1]+mutable[ip1][jp1]>0){
        return -(V[ip1][jp1]-V[ip1][j]+V[i][jp1]-V[i][j])/(2*h);
    }
    return 0;
    
},{output: [SIZE, SIZE],pipeline: true})

const Ey = gpu.createKernel(function(V,mutable,h,size) {
    let i=this.thread.y
    let j=this.thread.x
    let ip1= (i == size-1)? 0     :i+1;
    let jp1= (j == size-1)? 0     :j+1;
    if (mutable[i][j]+mutable[ip1][j]+mutable[i][jp1]+mutable[ip1][jp1]>0){
        return -(V[ip1][jp1]-V[i][jp1]+V[ip1][j]-V[i][j])/(2*h);
    }
    return 0;
    
},{output: [SIZE, SIZE],pipeline: true})

const M = gpu.createKernel(function(Ex,Ey) {
    let i=this.thread.y
    let j=this.thread.x
    return Math.sqrt(Ex[i][j]*Ex[i][j]+Ey[i][j]*Ey[i][j]);
    
},{output: [SIZE, SIZE],pipeline: true})


const getval = gpu.createKernel(function(a) {
return a[this.thread.y][this.thread.x];
}).setOutput([SIZE, SIZE])

const togpu = gpu.createKernel(function(a) {
return a[this.thread.y][this.thread.x];
},{output: [SIZE, SIZE],pipeline: true,immutable: true})

const toperm = gpu.createKernel(function(a) {
return 6-4*a[this.thread.y][this.thread.x];
},{output: [SIZE, SIZE],pipeline: true})

const SOR = gpu.createKernel(function(V,p,eps,mutable,w,h,parity,size) {
    let i=this.thread.y
    let j=this.thread.x
    let s=V[i][j];
    if ((i+j)%2==parity && mutable[i][j]==1){
        //getting the energy
        
        let im1= (i == 0)?      size-1:i-1;
        let ip1= (i == size-1)? 0     :i+1;
        let jm1= (j == 0)?      size-1:j-1;
        let jp1= (j == size-1)? 0     :j+1;
        let a0=eps[i][j]+eps[im1][j]+eps[i][jm1]+eps[im1][jm1]
        let a1=(eps[i][j]+eps[i][jm1])/2.0
        let a2=(eps[im1][j]+eps[i][j])/2.0
        let a3=(eps[im1][jm1]+eps[im1][j])/2.0
        let a4=(eps[i][jm1]+eps[im1][jm1])/2.0
        let R = (h**2*p[i][j]+a1*V[ip1][j]+a2*V[i][jp1]+a3*V[im1][j]+a4*V[i][jm1])/a0-V[i][j]

        s=V[i][j]+w*R
    }

    return s;
}, {
        output: [SIZE, SIZE],
        pipeline: true,
        immutable: true,
    });





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
        data[s + 1] = grid[x][y]*255;//0;
        data[s + 2] = grid[x][y]*255;
        data[s + 3] = 255;  // fully opaque
    }
    ctx.putImageData(imgData, 0, 0);
}

function Vmap(ctx,grid){
    var h = ctx.canvas.height;
    var w = ctx.canvas.width;
    //console.log(h/grid.length)
    scale=h/grid.length
    var imgData = ctx.getImageData(0, 0, w, h);
    var data = imgData.data;  // the array of RGBA values
    //console.log(data.length)
    //console.log(data[0])
    var max=-999;
    var min=999;
    for (var i=0;i<grid.length;i++){
    for (var j=0;j<grid[0].length;j++){
        if (grid[i][j]>max){max=grid[i][j]}
        if (grid[i][j]<min){min=grid[i][j]}
    }}
    for(var s = 0; s < data.length; s+=4) {
        x=Math.floor(s/4/w/scale);
        y=Math.floor(((s/4)%w)/scale)
        //s = 4 * x * w + 4 * y    probably
        var gij=(grid[x][y]-min)/(max-min)
        
        data[s] =     (gij)*255;
        data[s + 1] = (gij)*(1-gij)*1020;
        data[s + 2] = (1-gij)*255;
        data[s + 3] = 255;  // fully opaque
    }
    //console.log(data[0]);
    ctx.putImageData(imgData, 0, 0);
    //console.log('hwat?')
}

function Erender(ctx,V){
    EX=Ey(V,mutable,H,SIZE)
    EY=Ex(V,mutable,H,SIZE)
    mag=M(EX,EY)
    max=gpumax(mag)
    min=gpumin(mag)
    Emap(EX,EY,mag,max,min)
    ctx.drawImage(Emap.getCanvas(),0,0)
}

const Emap = gpu.createKernel(function(Ex,Ey,M,maxarr,minarr) {
    let j=this.thread.x
    //friggin uupside down and sideways jesus
    let i=511-this.thread.y
    let max=maxarr[0][0];
    let min=minarr[0][0];
    let R=16
    //coordintates of potential vector arrow this is part of
    let ri=Math.floor(i/R/2)*2*R+R
    let rj=Math.floor(j/R/2)*2*R+R
    //vector representing arrow
    let dx=-(R-4)*(Ex[ri][rj]/max)
    let dy=(R-4)*(Ey[ri][rj]/max)
    let m=(R-4)*(M[ri][rj])/max
    let inarrow=false;
    //now we check if it is inside the arrow
    if (m>0){
        let x = i-ri
        let y=j-rj
        //arrowhead can be done using inf and 1 norm in rotated coords
        let X = dx*(dy-y)/m - dy*(dx-x)/m
        let Y = dy*(dy-y)/m + dx*(dx-x)/m
        if (Math.abs(X)+0.5*Math.abs(Y)< 4 &&Math.abs(Y+4)<4){
            inarrow=true
        }
        //arrow body done by looking at length of orthogonal (to E field) part of pixel vector
        let d=x*dx+y*dy
        X = x-d*dx/m/m
        Y = y-d*dy/m/m
        if (d>0&&d<m*m && X*X+Y*Y<2){
            inarrow=true
        }
    }
    if (inarrow){
        this.color(0,0,0, 1);       
    }
    else{
        let gij=(M[i][j]-min)/(max-min)
        this.color(gij,4*gij*(1-gij),1-gij, 1);
    }
    
}).setOutput([512, 512]).setGraphical(true);

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
  mew = Math.pow(this.value,3)/25000.0;
  $('mewtext').innerHTML = mew.toFixed(5);
}
    

$("kT").oninput = function() {
  x = Math.pow((this.value/32),3)+0.8194
  kT = Math.exp(x);
  $('kTtext').innerHTML = kT.toFixed(3);
  //console.log(kT);
}

function nextVoltage(steps,eps){
for (var i=0;i<steps;i++){
    V2= SOR(V,p,eps,mutable,w,H,0,SIZE)
    V.delete()
    V = SOR(V2,p,eps,mutable,w,H,1,SIZE)
    V2.delete()
}
}


function run(){
    //TODO verify there isn't a memory leak with grid and grid2.
    n = Math.random()<=0.5?0:1
    grid = Propose(grid2,1/kT,mew,1-n,SIZE)
    grid2.delete()
    for (var i=0;i<stepsperframe-1;i++){
        n = Math.random()<=0.5?0:1
        grid2 = Propose(grid,1/kT,mew,n,SIZE)
        grid.delete()
        grid = Propose(grid2,1/kT,mew,1-n,SIZE)
        grid2.delete()
    }
    n = Math.random()<=0.5?0:1
    grid2 = Propose(grid,1/kT,mew,n,SIZE)
    grid.delete()
    
    toperm(grid);
    nextVoltage(400,eps);
    Erender(ctx2,V);
    //Vmap(ctx2,getval(M(Ex(V,mutable,H,SIZE),Ey(V,mutable,H,SIZE))));
    
    // getval copies grid2 to the cpu
    setpixels(ctx,getval(grid2));
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
random_ones([SIZE,SIZE],grid,SIZE*SIZE*1/2)
stepsperframe=Math.pow(2,-1)*2;
$('stepstext').innerHTML = "1/"+Math.pow(4,1);
var RGBData;
var NumSpecies=0;
//random_ones([128,128],grid,2000)

var canvas = document.getElementById('grid');
console.log(canvas);
ctx = canvas.getContext("2d");
var canvas2 = document.getElementById('Volts');
ctx2 = canvas2.getContext("2d");


setpixels(ctx,grid)
//start the pipeline
grid2 = Propose(grid,1/kT,mew,0,SIZE)
V = zeros([SIZE,SIZE]);
mutable=ones([SIZE,SIZE]);
for (var j=0;j<SIZE;j++){
    mutable[0][j]=0;
    mutable[SIZE-1][j]=0;
    V[0][j]=1;
    V[SIZE-1][j]=-1;
}
mutable=togpu(mutable)
V = togpu(V);
p=togpu(zeros([SIZE,SIZE]));
t = 2*Math.cos(Math.PI/SIZE)
w = (8-Math.sqrt(64-16*t*t))/t/t
console.log(w)
eps=toperm(grid);

console.log(getval(V))
console.log(getval(p))
console.log(getval(mutable))

nextVoltage(200,eps);
console.log(getval(V));
Vmap(ctx2,getval(V));
window.requestAnimationFrame(run)