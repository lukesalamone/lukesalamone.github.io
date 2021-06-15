function deepCopy(obj){
  return JSON.parse(JSON.stringify(obj));
}

function $(str){
  return document.querySelector(str);
}
