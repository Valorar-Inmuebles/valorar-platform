-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost
-- Tiempo de generación: 01-07-2026 a las 10:46:09
-- Versión del servidor: 5.7.44
-- Versión de PHP: 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `koper_motorola`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `assurant_provincias`
--

CREATE TABLE `assurant_provincias` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT '0',
  `cod` varchar(1) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_code` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo31662` varchar(4) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `assurant_provincias`
--

INSERT INTO `assurant_provincias` (`id`, `status`, `cod`, `branch_code`, `nombre`, `codigo31662`, `created_at`, `updated_at`) VALUES
(1, 1, 'C', 'CF', 'Capital Federal', 'AR-C', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(2, 1, 'B', 'BA', 'Buenos Aires', 'AR-B', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(3, 1, 'K', 'CT', 'Catamarca', 'AR-K', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(4, 1, 'X', 'CB', 'Córdoba', 'AR-X', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(5, 1, 'W', 'CN', 'Corrientes', 'AR-W', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(6, 1, 'E', 'ER', 'Entre Ríos', 'AR-E', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(7, 1, 'Y', 'JY', 'Jujuy', 'AR-Y', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(8, 1, 'M', 'MZ', 'Mendoza', 'AR-M', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(9, 1, 'F', 'LR', 'La Rioja', 'AR-F', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(10, 1, 'A', 'SA', 'Salta', 'AR-A', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(11, 1, 'J', 'SJ', 'San Juan', 'AR-J', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(12, 1, 'D', 'SL', 'San Luis', 'AR-D', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(13, 1, 'S', 'SF', 'Santa Fe', 'AR-S', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(14, 1, 'G', 'SE', 'Santiago Del Estero', 'AR-G', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(15, 1, 'T', 'TM', 'Tucumán', 'AR-T', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(16, 1, 'H', 'CC', 'Chaco', 'AR-H', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(17, 1, 'U', 'CH', 'Chubut', 'AR-U', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(18, 1, 'P', 'FM', 'Formosa', 'AR-P', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(19, 1, 'N', 'MN', 'Misiones', 'AR-N', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(20, 1, 'Q', 'NQ', 'Neuquén', 'AR-Q', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(21, 1, 'L', 'LP', 'La Pampa', 'AR-L', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(22, 1, 'R', 'RN', 'Río Negro', 'AR-R', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(23, 1, 'Z', 'SC', 'Santa Cruz', 'AR-Z', '2025-05-12 08:46:51', '2025-05-12 08:46:51'),
(24, 1, 'V', 'TF', 'Tierra Del Fuego', 'AR-V', '2025-05-12 08:46:51', '2025-05-12 08:46:51');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `assurant_provincias`
--
ALTER TABLE `assurant_provincias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `assurant_provincias_cod_unique` (`cod`),
  ADD UNIQUE KEY `assurant_provincias_branch_code_unique` (`branch_code`),
  ADD UNIQUE KEY `assurant_provincias_nombre_unique` (`nombre`),
  ADD UNIQUE KEY `assurant_provincias_codigo31662_unique` (`codigo31662`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `assurant_provincias`
--
ALTER TABLE `assurant_provincias`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
