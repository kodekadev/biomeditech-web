import {
  money,
  formatRut,
  normalizeRut,
  isValidEmail,
  validateRut,
  isActivo,
  incrementNro,
} from "../lib/utils";

// ── money ──────────────────────────────────────────────────────────────────
describe("money()", () => {
  test("formatea números con puntos de miles", () => {
    expect(money(85000)).toBe("$85.000");
    expect(money(1200000)).toBe("$1.200.000");
  });
  test("retorna guión para 0 o undefined", () => {
    expect(money(0)).toBe("—");
  });
});

// ── formatRut ──────────────────────────────────────────────────────────────
describe("formatRut()", () => {
  test("formatea RUT con puntos y guión", () => {
    expect(formatRut("76543210K")).toBe("76.543.210-K");
    expect(formatRut("123456789")).toBe("12.345.678-9");
  });
  test("acepta entrada con formato parcial", () => {
    expect(formatRut("76.543.210K")).toBe("76.543.210-K");
  });
  test("maneja entrada vacía", () => {
    expect(formatRut("")).toBe("");
    expect(formatRut("1")).toBe("1");
  });
});

// ── normalizeRut ────────────────────────────────────────────────────────────
describe("normalizeRut()", () => {
  test("elimina puntos, guiones y espacios", () => {
    expect(normalizeRut("76.543.210-K")).toBe("76543210k");
    expect(normalizeRut("76 543 210 K")).toBe("76543210k");
  });
  test("convierte a minúsculas", () => {
    expect(normalizeRut("12345678K")).toBe("12345678k");
  });
});

// ── isValidEmail ────────────────────────────────────────────────────────────
describe("isValidEmail()", () => {
  test("acepta correos válidos", () => {
    expect(isValidEmail("usuario@empresa.cl")).toBe(true);
    expect(isValidEmail("user.name+tag@sub.domain.com")).toBe(true);
  });
  test("rechaza correos inválidos", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("sin-arroba")).toBe(false);
    expect(isValidEmail("@nodomain")).toBe(false);
    expect(isValidEmail("noext@domain")).toBe(false);
    expect(isValidEmail("spaces in@email.com")).toBe(false);
  });
});

// ── validateRut ────────────────────────────────────────────────────────────
// RUTs verificados matemáticamente con el algoritmo módulo 11:
//   11.111.111-1  → sum=32, 32%11=10, r=1   → DV=1  ✓
//   99.302.000-1  → sum=76, 76%11=10, r=1   → DV=1  ✓ (formato SII)
//   11.111.112-K  → sum=34, 34%11=1,  r=10  → DV=K  ✓
describe("validateRut()", () => {
  test("acepta RUT vacío (campo opcional)", () => {
    expect(validateRut("")).toBe(true);
    expect(validateRut("   ")).toBe(true);
  });

  test("valida RUT con dígito verificador numérico", () => {
    expect(validateRut("11.111.111-1")).toBe(true);
    expect(validateRut("111111111")).toBe(true);    // sin formato
    expect(validateRut("99.302.000-1")).toBe(true); // RUT estilo SII
  });

  test("valida RUT con dígito verificador K", () => {
    expect(validateRut("11.111.112-K")).toBe(true);
    expect(validateRut("11111112K")).toBe(true);    // sin puntos
    expect(validateRut("11111112k")).toBe(true);    // k minúscula
  });

  test("rechaza RUT con dígito verificador incorrecto", () => {
    expect(validateRut("11.111.111-2")).toBe(false); // correcto es 1
    expect(validateRut("99.302.000-0")).toBe(false); // correcto es 1
    expect(validateRut("11.111.112-1")).toBe(false); // correcto es K
  });

  test("rechaza RUT con cuerpo no numérico", () => {
    expect(validateRut("ABCDEF-K")).toBe(false);
    expect(validateRut("---K")).toBe(false);
  });

  test("rechaza RUT corto con DV incorrecto", () => {
    expect(validateRut("1-2")).toBe(false); // DV correcto sería 9
  });
});

// ── isActivo ───────────────────────────────────────────────────────────────
describe("isActivo()", () => {
  test("reconoce variantes de activo", () => {
    expect(isActivo("activo")).toBe(true);
    expect(isActivo("Activo")).toBe(true);
    expect(isActivo("active")).toBe(true);
    expect(isActivo("ACTIVE")).toBe(true);
  });
  test("retorna false para otros valores", () => {
    expect(isActivo("inactivo")).toBe(false);
    expect(isActivo("")).toBe(false);
    expect(isActivo("pendiente")).toBe(false);
  });
});

// ── incrementNro ───────────────────────────────────────────────────────────
describe("incrementNro()", () => {
  test("incrementa el número correlativo", () => {
    expect(incrementNro("COT-2026-012")).toBe("COT-2026-013");
    expect(incrementNro("COT-2026-999")).toBe("COT-2026-1000");
  });
  test("retorna el string original si no coincide el patrón", () => {
    expect(incrementNro("INVALID")).toBe("INVALID");
    expect(incrementNro("")).toBe("");
  });
});
