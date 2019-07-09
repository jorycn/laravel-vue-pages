import cc from './c'

export const a = '100';

//导出方法
export const dogSay = function(){
    console.log('wang wang');
}

//导出方法第二种
function catSay(){
    console.log('miao miao');
}
export { catSay, cc };

//export default导出
const m = 100;
export default m;
