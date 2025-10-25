/**
 * Valida una cédula ecuatoriana usando el algoritmo del módulo 10.
 * Las cédulas ecuatorianas tienen 10 dígitos y cumplen con reglas específicas.
 * 
 * @param cedula - Cédula a validar (10 dígitos)
 * @returns true si la cédula es válida, false en caso contrario
 */
export function validateEcuadorianId(cedula: string): boolean {
  // Verificar que tenga exactamente 10 dígitos
  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }

  // Extraer los primeros dos dígitos (código de provincia)
  const provinceCode = Number.parseInt(cedula.substring(0, 2), 10);

  // Verificar que el código de provincia sea válido (01-24, excluyendo algunas)
  // Ecuador tiene 24 provincias
  if (provinceCode < 1 || provinceCode > 24) {
    return false;
  }

  // El tercer dígito debe ser menor a 6 para cédulas de personas naturales
  const thirdDigit = Number.parseInt(cedula.charAt(2), 10);
  if (thirdDigit >= 6) {
    return false;
  }

  // Extraer el dígito verificador (último dígito)
  const verifierDigit = Number.parseInt(cedula.charAt(9), 10);

  // Calcular el dígito verificador usando el algoritmo del módulo 10
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let product = Number.parseInt(cedula.charAt(i), 10) * coefficients[i];
    
    // Si el producto es mayor o igual a 10, sumar sus dígitos
    if (product >= 10) {
      product = product - 9; // Equivalente a sumar dígitos (ej: 14 -> 1+4=5, o 14-9=5)
    }
    
    sum += product;
  }

  // Calcular el módulo 10
  const modulo = sum % 10;
  
  // Si el módulo es 0, el dígito verificador debe ser 0
  // Si no, el dígito verificador debe ser 10 - módulo
  const expectedVerifier = modulo === 0 ? 0 : 10 - modulo;

  return verifierDigit === expectedVerifier;
}

/**
 * Obtiene el mensaje de error apropiado para una cédula inválida
 * 
 * @param cedula - Cédula a validar
 * @returns Mensaje de error descriptivo
 */
export function getEcuadorianIdError(cedula: string): string | null {
  if (!cedula) {
    return 'La cédula es requerida.';
  }

  if (!/^\d+$/.test(cedula)) {
    return 'La cédula solo debe contener números.';
  }

  if (cedula.length !== 10) {
    return 'La cédula debe tener exactamente 10 dígitos.';
  }

  const provinceCode = Number.parseInt(cedula.substring(0, 2), 10);
  if (provinceCode < 1 || provinceCode > 24) {
    return 'El código de provincia de la cédula no es válido.';
  }

  const thirdDigit = Number.parseInt(cedula.charAt(2), 10);
  if (thirdDigit >= 6) {
    return 'La cédula ingresada no corresponde a una persona natural.';
  }

  if (!validateEcuadorianId(cedula)) {
    return 'La cédula ingresada no es válida. Verifica los dígitos.';
  }

  return null;
}
