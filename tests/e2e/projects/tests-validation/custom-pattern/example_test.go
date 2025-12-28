package main

import "testing"

func TestExample(t *testing.T) {
	if true != true {
		t.Error("Expected true")
	}
}
