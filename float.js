let fs = require('fs');
let arg = process.argv;

let number1 = Number(arg[2]);
let number2 = Number(arg[3]);

let machine1 = GetMachineRepresentation(number1);
let machine2 = GetMachineRepresentation(number2);

//console.log("#1\t", machine1);
//console.log("#2\t", machine2);

let result = MachineArithmetic(machine1, machine2);
console.log("#1 + #2\t", result);

//console.log("m#1 -> decimal", MachineToNumber(machine1));
//console.log("m#2 -> decimal", MachineToNumber(machine2));

let resultNum = MachineToNumber(result);
console.log("Actual result:  ", resultNum);
console.log("Expected result:", number1 + number2);

function NumToBinaryString(x) {
    let sign = x >= 0 ? '0' : '1';
    if ((1 / x) === -Infinity && x === 0) sign = '1';
    let integer = Trunc(Math.abs(x));
    let fraction = Math.abs(x) - integer;
    let resultInt = "";
    let resultFract = "";

    let encounteredOne = false; // нужно для того, чтобы вести запись f 
                                // (дробной части мантиссы) с первой единицы 
    let digits = 0; // содержит кол-во цифр, которые попадут в мантиссу. max == 23
    
    while (integer > 0) {
        resultInt = (integer % 2 == 0 ? '0' : '1') + resultInt;
        integer = parseInt(integer / 2);
        encounteredOne = true;
        digits++;
    }

    while (fraction > 0 && digits <= 24) {
        fraction *= 2;
        let currentDigit = Trunc(fraction) == 0 ? '0' : '1';
        resultFract += currentDigit;
        if (currentDigit == '1') encounteredOne = true;
        fraction -= Trunc(fraction) == 0 ? 0 : 1;
        if (encounteredOne)
            digits++;
    }

    if (x == 0) resultInt = "0";

    return [sign, resultInt, resultFract];
}

function GetMachineRepresentation(number) {
    let binary = NumToBinaryString(number);
    let sign = binary[0];
    let integer = binary[1];
    let fractional = binary[2];
    let result = sign;

    let p = 0;
    let pm = "";
    let f = "";

    // вычисление порядка числа
    if (integer.length > 0) {
        p = integer.length - 1;
    } else if (fractional.length > 0) {
        while (fractional.charAt(p) != '1')
            p++;
        p++;
        p *= -1;
    }
    // console.log("p", p);

    // NaN
    if (isNaN(number)) {
        result = '0';
        pm = NumToBinaryString(255)[1];
        result += pm;
        while (result.length < 31)
            result += '0';
        result += '1';
        return result;
    }

    // p' >= 255
    // проверка на +- Infinity
    if (Math.abs(number) == Infinity || p + 127 >= 255) {
        result = number > 0 ? '0' : '1';
        pm = NumToBinaryString(255)[1];
        result += pm;
        while (result.length < 32)
            result += '0';
        return result;
    }

    // проверка на 0 и числа с p < -127
    if (number == 0 || p < -127) {
        result = (1 / number) === -Infinity || number < 0 ? '1' : '0';
        while (result.length < 32)
            result += '0';
        return result;
    }

    pm = NumToBinaryString(p + 127)[1];
    if (pm.length < 8) {
        while (pm.length < 8)
            pm = '0' + pm;
    }
    result += pm;

    // запись мантиссы
    if (p >= 0)
        f = (integer + fractional).substring(1);
    else f = fractional.substring(p != -127 ? -p : -p - 1);

    if (f.length > 23)
        f = f.substr(0, 23);

    result += f;

    while (result.length < 32)
        result += '0';
    
    return result;
}

function MachineToNumber(machineNum) {
    let sign = machineNum.charAt(0);
    let p = BinaryStringToNum(['0', machineNum.substr(1, 8), ""]) - 127;
    let f = TrimZerosFrom('1' + machineNum.substring(9), "right");
    let result = BinaryStringToNum(['0', f, ""]);

    // перемещаем запятую на нужное место
    for (let i = 0; i < f.length - 1; i++)
        result /= 2;
    for (let i = 0; i < Math.abs(p); i++)
        result *= p > 0 ? 2 : 0.5;
    
    // проверка на 0
    let isZero = true;
    for (let i = 1; i < machineNum.length; i++)
        if (machineNum.charAt(i) == '1')
            isZero = false;
    
    if (isZero) {
        if (sign == '0') return 0;
        return -0;
    }

    // проверка на денорм. числа при p' == 255
    if (p == 128) {
        if (BinaryStringToNum(['0', machineNum.substring(9), ""]) == 0) {
            if (sign == '0') return Infinity;
            return -Infinity;
        } else return Number.NaN;
    }

    return result * (sign == '0' ? 1 : -1);
}

function BinaryStringToNum(binaryNumberParts) {
    let result = 0;
    let sign = binaryNumberParts[0];
    let integer = binaryNumberParts[1];
    let fraction = binaryNumberParts[2];

    let pow2 = 1;
    for (let i = integer.length - 1; i >= 0; i--) {
        if (integer.charAt(i) == '1')
            result += pow2;
        pow2 = pow2 << 1;
    }

    pow2 = 2;
    for (let i = 0; i < fraction.length; i++) {
        if (fraction.charAt(i) == '1')
            result += 1 / pow2;
        pow2 = pow2 << 1;
    }

    if (sign == '1')
        result *= -1;
    
    return result;
}

// принимает числа в "машинном" виде
// возвращает результат сложения двух чисел так же в машинном виде

function MachineArithmetic(number1, number2) {

    let sign1 = number1.charAt(0);
    let pm1 = number1.substring(1, 9);
    let f1 = number1.substring(9);
    let p1 = BinaryStringToNum(['0', pm1, ""]) - 127;
    let pocket1 = p1 != -127 ? 1 : 0;
    
    let sign2 = number2.charAt(0);
    let pm2 = number2.substring(1, 9);
    let f2 = number2.substring(9);
    let p2 = BinaryStringToNum(['0', pm2, ""]) - 127;
    let pocket2 = p2 != -127 ? 1 : 0;

    // проверка на p' == 255
    if (p1 == 128) return number1;
    if (p2 == 128) return number2;

    // приведение к общему порядку
    if (p1 != p2) {
        if (p1 > p2) {
            let dp = p1 - p2;
            f2 = String(pocket2) + f2;
            for (let i = 0; i < dp - 1; i++)
                f2 = '0' + f2;
            pocket2 = 0;
            p2 = p1;
            pm2 = pm1;
            f2 = f2.substr(0, 23);
        } else {
            let dp = p2 - p1;
            f1 = String(pocket1) + f1;
            for (let i = 0; i < dp - 1; i++)
                f1 = '0' + f1;
            pocket1 = 0;
            p1 = p2;
            pm1 = pm2;
            f1 = f1.substr(0, 23);
        }
    }
    
    /* Если числа одинаковых знаков, то происходит сложение 
    двух чисел и в конце дописывается их общий sign.
    Если же числа разных знаков, то результат будет того знака
    числа, что больше по модулю. Тогда из наибольшего по модулю
    вычитаеся меньшее и приписывается знак, найденный ранее.*/

    let p = 0;
    let pocket = ""; 
    let f = "";
    let pm = "";
    let accum = 0;

    if (sign1 == sign2) { 
        // сложение чисел одинаковых знаков
        // сложение f1 и f2

        for (let i = f1.length - 1; i >= 0; i--) {
            let d1 = Number(f1.charAt(i));
            let d2 = Number(f2.charAt(i));

            f = String((d1 + d2 + accum) % 2) + f;
            accum = parseInt((d1 + d2 + accum) / 2);
        }
        pocket = NumToBinaryString(pocket1 + pocket2 + accum)[1];
        f = (pocket + f).substr(1, 23); 
        p = p1 + pocket.length - 1; // смещаем порядок
    } else { 
        // сложение чисел разных знаков
        
        let n1 = MachineToNumber(number1);
        let n2 = MachineToNumber(number2);

        if (Math.abs(n1) == Math.abs(n2))
            return GetMachineRepresentation(0);
        if (Math.abs(n1) < Math.abs(n2)) {
            let tmpStr = f1;
            f1 = f2;
            f2 = tmpStr;
            let tmpNum = pocket1;
            pocket1 = pocket2;
            pocket2 = tmpNum
            sign1 = sign2;
        }

        // |number1| > |number2| => вычитаем f2 из f1
        for (let i = f1.length - 1; i >= 0; i--) {
            let d1 = Number(f1.charAt(i));
            let d2 = Number(f2.charAt(i));

            if (d1 + accum < d2) {
                f = String(2 + d1 + accum - d2) + f;
                accum = -1;
            } else {
                f = String(d1 + accum - d2) + f;
                accum = 0;
            }
        }
        pocket = NumToBinaryString(pocket1 - pocket2 + accum)[1];

        p = p1; // смещаем порядок
        let tmp = pocket + f;
        for (let i = 0; i < tmp.length; i++){
            if (tmp.charAt(i) == '1')
                break;
            p--;
        }

        f = (pocket + f).substr(1 + p1 - p, 23);
        while (f.length < 23)
            f += '0';
    }

    pm = NumToBinaryString(p + 127)[1];
    while (pm.length < 8)
        pm = '0' + pm;

    return sign1 + pm + f;
}

function TrimZerosFrom(str, side) {
    if (side == "right") {
        for (let firstIn = str.length; firstIn >= 0; firstIn--)
            if (str.charAt(firstIn) != '0')
                return str.substring(0, firstIn);
        return "";
    }
    
    // обрезаем слева
    for (let firstIn = 0; firstIn < str.length; firstIn++)
    if (str.charAt(firstIn) != '0')
        return str.substring(firstIn);
    return str;
}

function Trunc(number) {
    if (number >= 0)
        return Math.floor(number);
    else
        return Math.floor(number) + 1;
}