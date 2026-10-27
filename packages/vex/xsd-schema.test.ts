import { beforeEach, describe, expect, it } from 'bun:test';
import { XsdSchema } from './xsd-schema';

describe('XsdSchema', () => {
	let schema: XsdSchema;

	beforeEach(() => {
		schema = new XsdSchema(`<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
	<xs:attributeGroup name="color">
		<xs:attribute name="color" type="xs:string"/>
	</xs:attributeGroup>
	<xs:attributeGroup name="print-style">
		<xs:attributeGroup ref="color"/>
		<!--<xs:attribute name="commented-out"/>-->
	</xs:attributeGroup>
	<xs:complexType name="empty-placement">
		<xs:attributeGroup ref="print-style"/>
		<xs:attribute name="placement" type="xs:string"/>
	</xs:complexType>
	<xs:complexType name="fermata">
		<xs:simpleContent>
			<xs:extension base="xs:string">
				<xs:attribute name="type" type="xs:string"/>
				<xs:attributeGroup ref="print-style"/>
			</xs:extension>
		</xs:simpleContent>
	</xs:complexType>
	<xs:complexType name="strong-accent">
		<xs:complexContent>
			<xs:extension base="empty-placement">
				<xs:attribute name="type" type="xs:string"/>
			</xs:extension>
		</xs:complexContent>
	</xs:complexType>
	<xs:complexType name="notations">
		<xs:sequence>
			<xs:element name="fermata" type="fermata"/>
			<xs:element name="strong-accent" type="strong-accent"/>
			<xs:element name="accent" type="empty-placement"/>
		</xs:sequence>
		<xs:attribute ref="xml:lang"/>
	</xs:complexType>
	<xs:element name="score-partwise">
		<xs:complexType>
			<xs:sequence>
				<xs:element name="notations" type="notations"/>
				<xs:element name="step" type="xs:string"/>
			</xs:sequence>
			<xs:attribute name="version" type="xs:string"/>
		</xs:complexType>
	</xs:element>
</xs:schema>`);
	});

	function attributesOf(name: string): string[] {
		return [...(schema.elements().get(name) ?? [])].sort();
	}

	it('lists every declared element in name order', () => {
		expect([...schema.elements().keys()]).toEqual([
			'accent',
			'fermata',
			'notations',
			'score-partwise',
			'step',
			'strong-accent',
		]);
	});

	it('follows attribute groups and leaves out comments', () => {
		expect(attributesOf('accent')).toEqual(['color', 'placement']);
	});

	it('reads attributes on a simple content extension', () => {
		expect(attributesOf('fermata')).toEqual(['color', 'type']);
	});

	it('inherits the attributes of a complex content base', () => {
		expect(attributesOf('strong-accent')).toEqual([
			'color',
			'placement',
			'type',
		]);
	});

	it('names a referenced attribute by its reference', () => {
		expect(attributesOf('notations')).toEqual(['xml:lang']);
	});

	it('keeps an inline type to its own element, not the children it declares', () => {
		expect(attributesOf('score-partwise')).toEqual(['version']);
	});

	it('gives a simple typed element no attributes', () => {
		expect(attributesOf('step')).toEqual([]);
	});
});
